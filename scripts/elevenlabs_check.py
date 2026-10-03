#!/usr/bin/env python3
"""Inspección directa y de lectura. Nunca imprime la API key ni crea agentes."""
import argparse
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote
from urllib.request import Request, HTTPRedirectHandler, build_opener

API = "https://api.elevenlabs.io"
ENV = Path(__file__).resolve().parents[1] / ".env"


class AccessError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Una redirección no puede transportar la credencial a otro destino.
        return None


def load_key(path=ENV):
    value = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not value and path.exists():
        values = []
        for line in path.read_text(encoding="utf-8").splitlines():
            name, sep, candidate = line.strip().partition("=")
            if sep and name.strip() == "ELEVENLABS_API_KEY":
                values.append(candidate.strip())
        if len(values) > 1:
            raise AccessError("Deja una sola definición de ELEVENLABS_API_KEY en .env.")
        value = values[0] if values else ""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    if not value:
        raise AccessError("Falta ELEVENLABS_API_KEY. Completa el archivo local .env y guarda; no la pegues en el chat.")
    if any(c.isspace() for c in value):
        raise AccessError("La API key contiene espacios o saltos de línea; revisa el archivo local.")
    return value


def get_json(key, path, params=None):
    if not path.startswith("/v1/") or "?" in path or "#" in path:
        raise AccessError("Ruta de API no permitida.")
    url = API + path + ("?" + urlencode(params) if params else "")
    request = Request(url, headers={"xi-api-key": key, "Accept": "application/json"}, method="GET")
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            return json.load(response)
    except HTTPError as exc:
        messages = {
            401: "Clave rechazada, caducada o sin autorización suficiente para este endpoint.",
            403: "Acceso denegado: comprobar permisos de lectura o restricciones de IP.",
            404: "Recurso no encontrado o no visible para esta clave.",
            429: "Límite de solicitudes alcanzado; volver a intentar más tarde.",
        }
        # No imprimir cuerpo/headers, que podrían incluir datos privados o credenciales.
        raise AccessError(f"HTTP {exc.code}: " + messages.get(exc.code, "La consulta no se completó.")) from None
    except (URLError, TimeoutError, OSError):
        raise AccessError("No se pudo conectar con api.elevenlabs.io; revisar red/TLS y volver a intentar.") from None
    except ValueError:
        raise AccessError("La API devolvió una respuesta no válida; no se muestra el contenido.") from None


def agents(key):
    result, cursor, seen = [], None, set()
    while True:
        params = {"page_size": 100, "archived": "false"}
        if cursor:
            params["cursor"] = cursor
        page = get_json(key, "/v1/convai/agents", params)
        for agent in page.get("agents", []):
            result.append({"agent_id": agent.get("agent_id"), "name": agent.get("name"), "archived": agent.get("archived", False)})
        if not page.get("has_more"):
            return result
        cursor = page.get("next_cursor")
        if not cursor or cursor in seen:
            raise AccessError("Paginación incoherente; no se declara la lista como completa.")
        seen.add(cursor)


def agent_config(key, agent_id):
    if not re.fullmatch(r"[A-Za-z0-9_-]+", agent_id):
        raise AccessError("Identificador de agente inválido.")
    data = get_json(key, "/v1/convai/agents/" + quote(agent_id, safe=""))
    config = data.get("conversation_config", {})
    prompt = config.get("agent", {}).get("prompt", {})
    tts = config.get("tts", {})
    return {"agent_id": agent_id, "llm": prompt.get("llm"), "language": config.get("agent", {}).get("language"), "voice_id": tts.get("voice_id"), "tts_model": tts.get("model_id"), "knowledge_items": len(prompt.get("knowledge_base") or []), "tool_count": len(prompt.get("tools") or prompt.get("tool_ids") or [])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", help="ID del agente cuya configuración se quiere inspeccionar.")
    parser.add_argument("--models", action="store_true", help="Consultar LLMs disponibles; requiere acceso al endpoint correspondiente.")
    parser.add_argument("--subscription", action="store_true", help="Consultar plan y cuota; requiere lectura de usuario. No guardar el resultado en Git.")
    args = parser.parse_args()
    try:
        key = load_key()
        found = agents(key)
        result = {"connection": "verified", "active_agent_count": len(found), "agents": found}
        if args.agent:
            result["configuration"] = agent_config(key, args.agent)
        if args.models:
            result["available_llms"] = [{"model": item.get("llm"), "supports_image_input": item.get("supports_image_input")} for item in get_json(key, "/v1/convai/llm/list").get("llms", [])]
        if args.subscription:
            subscription = get_json(key, "/v1/user/subscription")
            result["subscription"] = {field: subscription.get(field) for field in ("tier", "status", "character_count", "character_limit")}
        # Solo campos seleccionados. Proteger incluso frente a una reflexión accidental de la clave.
        print(json.dumps(result, ensure_ascii=False, indent=2).replace(key, "[REDACTED]"))
        return 0
    except AccessError as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
