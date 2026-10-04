# Bóveda Obsidian

Las transcripciones y notas que genera el agente se guardan como Markdown en una **bóveda privada de Obsidian**, fuera de este repo público. Decisión: [ADR-0011](../context/decisions/ADR-0011.md).

## Preparar una computadora

1. Instalar Obsidian (`brew install --cask obsidian` o obsidian.md).
2. Clonar la bóveda privada fuera de este repo. Requiere invitación al repo:
   ```sh
   git clone https://github.com/soyabrahamarriaga-lang/userhelper-vault.git ~/Documents/UserHelper-Vault
   ```
3. En Obsidian: **Open folder as vault** → `~/Documents/UserHelper-Vault`.
4. En `.env` de este repo: `VAULT_PATH=/Users/<tu-usuario>/Documents/UserHelper-Vault` (ruta absoluta). `ELEVENLABS_API_KEY` es la misma del agente.
5. `npm run dev:token` (ahora arranca `server/main.mjs`: LiveKit + agente + bóveda) y `npm run dev`. Al arrancar, el servidor avisa qué variable falta, sin mostrar valores.
6. Para compartir con el equipo: `./sync.sh` dentro de la bóveda (commit + pull + push).

## Qué se escribe

```
UserHelper-Vault/
├─ Inicio.md
├─ catalogo-procesos.json  ← categorías editables
├─ Procesos/contabilidad/<tipo>/<nombre>--<id>.md
├─ Procesos/Indice-generado.md
├─ Sesiones/<AAAA-MM-DD>-<conversation_id>/
│   ├─ transcripcion.md   ← ElevenLabs, al terminar la conversación
│   ├─ eventos.md         ← pantalla, preguntas, guardrails (OCR conectado; client tools adicionales pendientes)
│   ├─ process-flow.json · flujo.canvas · evidencia-flujo.md · mapa-generado.md
│   ├─ extraccion-proceso.json · proceso-metadata.json · capturas.json
│   ├─ capturas/             ← originales privados, nunca en el repo público
│   └─ work-map.md · debrief.md · teach-back.md
├─ Guardrails/            ← una nota por regla confirmada
└─ Plantillas/
```

`transcripcion.md` lleva frontmatter (`tipo`, `conversacion`, `agente`, `estado`, `inicio` ISO UTC, `duracion_s`, `resultado`, `tags`) y una línea por turno: `**[03:12] Persona:** …`. Los eventos usan `` - `03:12` **guardrail** — texto ^ref `` para poder enlazarlos desde el Work Map con `[[eventos#^ref]]`.

## Flujo

**Automático (principal):** con `VAULT_PATH`, `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID`, `npm run dev:token` copia a la bóveda cada `VAULT_SYNC_MINUTES` (2 por defecto) todas las conversaciones terminadas del agente que falten, incluidas las iniciadas fuera de UserHelper (panel de ElevenLabs, otra computadora). No necesita URL pública. Ya guardadas = se omiten.

**Inmediato desde la app:**

1. La persona termina la conversación en `#senior/agent`.
2. La app llama `POST /api/vault/conversations/:id/import`; el backend pide la conversación a ElevenLabs y la escribe. Reintenta mientras ElevenLabs responde `processing`.
3. La pantalla muestra «Transcripción guardada en la bóveda: …». Sin `VAULT_PATH`, no muestra nada.

Alternativa sin la app abierta: webhook post-llamada de ElevenLabs a `POST /api/elevenlabs/webhook` con `ELEVENLABS_WEBHOOK_SECRET`. Necesita URL HTTPS pública (túnel o despliegue).

## El tutor aprende de la bóveda

Con `ELEVENLABS_TUTOR_AGENT_ID` en `.env`, el backend junta las notas de `Procesos/` (pasos, decisiones, motivos y límites del experto) en un documento y lo mantiene en la **base de conocimiento del tutor** en ElevenLabs. Solo lo reemplaza cuando las notas cambian y no toca su prompt. Forzarlo: `npm run tutor:knowledge`. Estado: `Procesos/tutor-conocimiento.json`. Decisión: [ADR-0016](../context/decisions/ADR-0016.md).

## Tutorías

Las conversaciones del tutor se guardan en `Tutorias/<fecha>-<id>/transcripcion.md` (Aprendiz / Tutor), separadas de `Sesiones/` para que el tutor no aprenda de sus propias respuestas. Decisión: [ADR-0017](../context/decisions/ADR-0017.md).

## Endpoints

| Método y ruta | Uso |
|---|---|
| `GET /api/vault/status` | `{configured, canImport}` |
| `GET /api/vault/sessions` | Lista de sesiones con su frontmatter |
| `POST /api/vault/conversations/:id/import` | Trae y guarda la transcripción de ElevenLabs |
| `POST /api/vault/sessions/:id/events` | `{kind, text, at?, ref?}`; `kind` ∈ screen, question, answer, guardrail, decision, note |
| `POST /api/vault/sessions/:id/notes/:name` | `{markdown}`; `name` ∈ work-map, debrief, teach-back |
| `POST /api/elevenlabs/webhook` | Webhook firmado `post_call_transcription` |

Todas excepto el webhook exigen el origen exacto de `APP_ORIGIN` y JSON.

## Límites

- Privado: no copiar notas de la bóveda a este repo, issues ni capturas públicas.
- Sin redacción automática de datos personales ni botón de retiro todavía. Retirar = borrar la nota y revisar qué Work Map la cita.
- La firma del webhook no se ha probado con un envío real de ElevenLabs.
- Verificado con una conversación real del agente (46 s, 2026-10-03) importada por la sincronización; una segunda pasada la omitió.
- La sesión `ejemplo_sintetico_demo` de la bóveda es sintética, creada para verificar la escritura; se puede borrar.

## Diagramas interactivos

Las nuevas importaciones generan una guía por acciones con captura, instrucciones y motivo, además del Canvas. El análisis estructurado usa Data collection del agente existente. Nombre, departamento y tipo de tarea se editan desde UserHelper; las notas se clasifican por esos campos. Las sesiones anteriores se procesan con `npm run maps:backfill` o al abrir **Mapas de procesos** en UserHelper. Abre `flujo.canvas` en Obsidian para recorrerlo. Si editas ese Canvas, se conserva: UserHelper ofrece descargar el borrador actual en otro archivo. Las notas `work-map.md` manuales no se sobrescriben. Contrato y límites: [PROCESS-MAPS.md](PROCESS-MAPS.md); ADR-0017 sustituye la extracción de ADR-0016. Las notas clasificadas editadas manualmente también se conservan. El índice se actualiza al listar o reconstruir. Recuperar análisis/imágenes previos requiere `npm run maps:rebuild`; `--reanalyze` solicita nuevo análisis al proveedor.
