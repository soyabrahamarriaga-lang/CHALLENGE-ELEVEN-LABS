#!/usr/bin/env python3
"""Contexto verificable usando únicamente Python 3.9+ y Git."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import uuid

ZERO = "0" * 40
ENTRIES = "context/entries/"
REQUIRED = (
    "README.md", "AGENTS.md", "CLAUDE.md", "CONTRIBUTING.md",
    "context/STATE.md", "context/ontology.json", "context/actors.json", "docs/CHALLENGE.md",
    "context/decisions/ADR-0001.md", "scripts/harness.py",
    "tests/test_harness.py", ".github/workflows/integrity.yml",
    ".githooks/pre-commit", ".githooks/pre-push",
)
GENERATED = {"node_modules", "dist", "build", ".next", "coverage", "__pycache__", ".venv", "venv"}
BINARY_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".mp3", ".mp4", ".wav", ".exe", ".dll", ".dmg", ".sqlite", ".db", ".pyc", ".woff", ".woff2"}
MAX_BYTES = 1024 * 1024


class Invalid(Exception):
    pass


def git(*args, data=None):
    p = subprocess.run(["git", *args], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        raise Invalid(p.stderr.decode("utf-8", "replace").strip())
    return p.stdout


def root():
    return Path(git("rev-parse", "--show-toplevel").decode().strip())


def head_or_empty():
    p = subprocess.run(["git", "rev-parse", "--verify", "HEAD"], capture_output=True)
    return p.stdout.decode().strip() if p.returncode == 0 else empty_tree()


def empty_tree():
    return git("hash-object", "-t", "tree", "--stdin", data=b"").decode().strip()


def changes(base, head=None):
    args = ["diff", "--no-renames", "--name-status", "-z"]
    args += [base, head] if head else ["--cached", base]
    parts = git(*args).decode("utf-8").rstrip("\0").split("\0")
    return dict(zip(parts[1::2], parts[0::2])) if parts != [""] else {}


class Snapshot:
    def __init__(self, revision=None):
        self.items = {}
        self.cache = {}
        raw = git("ls-tree", "-rz", "--full-tree", revision) if revision else git("ls-files", "--stage", "-z")
        for line in raw.split(b"\0"):
            if not line:
                continue
            meta, path = line.split(b"\t", 1)
            mode, middle, last = meta.decode().split()
            if revision:
                oid = last
            else:
                oid = middle
                if last != "0":
                    raise Invalid("Hay conflictos sin resolver en el índice.")
            self.items[path.decode("utf-8")] = (mode, oid)

    def raw(self, path):
        if path not in self.items:
            raise Invalid("Falta el archivo requerido: " + path)
        if path not in self.cache:
            self.cache[path] = git("cat-file", "blob", self.items[path][1])
        return self.cache[path]

    def json(self, path):
        try:
            return json.loads(self.raw(path))
        except (ValueError, UnicodeError) as exc:
            raise Invalid("JSON inválido en " + path) from exc


def require(ok, message):
    if not ok:
        raise Invalid(message)


def text_value(value):
    return isinstance(value, str) and bool(value.strip())


def text_list(value, nonempty=False):
    return isinstance(value, list) and (bool(value) or not nonempty) and all(text_value(x) for x in value)


def check_files(snap):
    for path in REQUIRED:
        require(path in snap.items, "Falta el archivo requerido: " + path)
    for path, (mode, _) in snap.items.items():
        p = PurePosixPath(path)
        require(mode in {"100644", "100755"}, path + ": no se admiten enlaces ni submódulos; debe incluirse el contenido.")
        require(not any(part in GENERATED for part in p.parts), path + ": archivo generado/dependencia; conserva la fuente.")
        require(p.suffix.lower() not in BINARY_SUFFIXES, path + ": solo código y archivos de texto UTF-8.")
        require(not (p.name == ".env" or p.name.startswith(".env.") and p.name not in {".env.example", ".env.sample"}), path + ": configuración privada no permitida.")
        require(p.suffix.lower() not in {".pem", ".key", ".p12", ".pfx"}, path + ": archivo de credenciales no permitido.")
        data = snap.raw(path)
        require(len(data) <= MAX_BYTES, path + ": excede 1 MiB; revisar la política mediante una decisión.")
        require(b"\0" not in data, path + ": contenido binario.")
        require(not data.startswith(b"version https://git-lfs.github.com/spec/v1"), path + ": puntero LFS; falta el contenido fuente.")
        try:
            data.decode("utf-8")
        except UnicodeError as exc:
            raise Invalid(path + ": debe ser texto UTF-8.") from exc


def check_model(snap):
    actors = snap.json("context/actors.json")
    require(isinstance(actors, dict) and actors.get("version") == 1, "Registro de actores inválido.")
    ids = set()
    for actor in actors.get("actors", []):
        require(isinstance(actor, dict) and text_value(actor.get("id")), "Actor sin ID.")
        require(actor["id"] not in ids, "Actor duplicado: " + actor["id"])
        require(actor.get("kind") in {"human", "agent"} and text_value(actor.get("name")), "Actor sin tipo/nombre.")
        ids.add(actor["id"])
    require(bool(ids), "Se necesita al menos un actor.")
    model = snap.json("context/ontology.json")
    require(isinstance(model, dict) and model.get("version") == 1, "Ontología inválida.")
    entities = model.get("entities")
    require(isinstance(entities, list) and bool(entities), "Faltan entidades en la ontología.")
    entities_by_id = {}
    for entity in entities:
        require(isinstance(entity, dict), "Entidad inválida.")
        for field in ("id", "name", "definition", "evidence"):
            require(text_value(entity.get(field)), "Entidad sin " + field)
        require(entity["id"] not in entities_by_id, "Entidad duplicada: " + entity["id"])
        require(entity.get("status") in {"confirmed", "hypothesis", "retired"}, "Estado de entidad inválido.")
        entities_by_id[entity["id"]] = entity
    require(isinstance(model.get("relations"), list), "Faltan relaciones.")
    for relation in model["relations"]:
        require(isinstance(relation, dict), "Relación inválida.")
        require(relation.get("from") in entities_by_id and relation.get("to") in entities_by_id, "Relación apunta a una entidad inexistente.")
        require(text_value(relation.get("type")) and text_value(relation.get("meaning")), "Relación sin tipo o significado.")
    require(text_list(model.get("invariants"), True), "Faltan invariantes.")
    require(text_list(model.get("open_questions")), "Preguntas ontológicas inválidas.")
    return ids


def validate_entry(snap, path, actor_ids):
    entry = snap.json(path)
    require(isinstance(entry, dict) and entry.get("version") == 1, path + ": formato inválido.")
    require(entry.get("id") == PurePosixPath(path).stem, path + ": ID no coincide con el nombre.")
    for key in ("at", "operator", "tool", "task", "summary", "result", "ontology_review"):
        require(text_value(entry.get(key)), path + ": falta " + key)
    try:
        timestamp = datetime.fromisoformat(entry["at"].replace("Z", "+00:00"))
        require(timestamp.utcoffset() is not None, path + ": fecha sin zona horaria.")
    except ValueError as exc:
        raise Invalid(path + ": fecha inválida.") from exc
    require(entry.get("actor") in actor_ids, path + ": actor no registrado.")
    require(text_list(entry.get("files")), path + ": files debe ser una lista.")
    for key in ("decisions", "validation", "next_steps"):
        require(text_list(entry.get(key), True), path + ": falta lista " + key)
    require(text_list(entry.get("adr_refs")), path + ": adr_refs debe ser una lista.")
    require(len(set(entry["files"])) == len(entry["files"]), path + ": archivos duplicados.")
    for name in entry["files"]:
        require(not name.startswith("/") and ".." not in PurePosixPath(name).parts, path + ": ruta inválida.")
    for ref in entry["adr_refs"]:
        require(ref.startswith("context/decisions/") and ref in snap.items, path + ": ADR inexistente: " + ref)
    return entry


def check_snapshot(snap):
    check_files(snap)
    actors = check_model(snap)
    for path in snap.items:
        if path.startswith(ENTRIES):
            require(path.endswith(".json"), "La bitácora solo admite entradas JSON: " + path)
            validate_entry(snap, path, actors)
    return actors


def check_delta(snap, delta, actors):
    if not delta:
        return
    entries = [p for p, status in delta.items() if p.startswith(ENTRIES) and status == "A"]
    for path, status in delta.items():
        require(not path.startswith(ENTRIES) or status == "A", "La bitácora es inmutable: " + path + "; añade una corrección nueva.")
    require(bool(entries), "Cada commit necesita una entrada NUEVA en context/entries/.")
    covered = set()
    for path in entries:
        covered.update(validate_entry(snap, path, actors)["files"])
    missing = set(delta) - set(entries) - covered
    require(not missing, "Archivos sin documentar en la bitácora: " + ", ".join(sorted(missing)))
    if "context/ontology.json" in delta:
        require(any(snap.json(p)["adr_refs"] for p in entries), "Un cambio ontológico debe enlazar un ADR.")


def check_range(base, head):
    head = git("rev-parse", "--verify", head + "^{commit}").decode().strip()
    initial = not base or base == ZERO
    if not initial:
        base = git("rev-parse", "--verify", base + "^{commit}").decode().strip()
    # Validar también commits intermedios: un binario añadido y borrado no desaparece del historial.
    revisions = git("rev-list", "--reverse", "--no-merges", head, *([] if initial else ["^" + base])).decode().splitlines()
    for revision in revisions:
        parent_line = git("rev-list", "--parents", "-n", "1", revision).decode().split()
        parent = parent_line[1] if len(parent_line) > 1 else empty_tree()
        snap = Snapshot(revision)
        try:
            actors = check_snapshot(snap)
            check_delta(snap, changes(parent, revision), actors)
        except Invalid as exc:
            raise Invalid(revision[:12] + ": " + str(exc)) from exc
    snap = Snapshot(head)
    actors = check_snapshot(snap)
    # También revisa el resultado agregado, incluidos los commits de merge.
    check_delta(snap, changes(empty_tree() if initial else base, head), actors)


def staged_check():
    snap = Snapshot()
    actors = check_snapshot(snap)
    check_delta(snap, changes(head_or_empty()), actors)


def clean_check():
    require(not git("status", "--porcelain", "--untracked-files=all"), "Hay archivos modificados o sin seguimiento. Incluye código y contexto antes de subir; revisa git status.")


def pre_push():
    clean_check()
    lines = sys.stdin.read().splitlines()
    for line in lines:
        _, local_sha, _, remote_sha = line.split()
        if local_sha == ZERO:
            continue
        if remote_sha == ZERO:
            # Una rama nueva no necesita revalidar la historia ya compartida en main.
            p = subprocess.run(["git", "merge-base", "refs/remotes/origin/main", local_sha], capture_output=True)
            remote_sha = p.stdout.decode().strip() if p.returncode == 0 else ZERO
        check_range(remote_sha, local_sha)


def record(args):
    require(re.fullmatch(r"[a-z0-9_-]+", args.actor), "El ID del actor solo admite letras minúsculas, números, guiones y guiones bajos.")
    actors = json.loads((root() / "context/actors.json").read_text(encoding="utf-8"))
    require(args.actor in {a["id"] for a in actors["actors"]}, "Registra primero el actor en context/actors.json.")
    delta = changes(head_or_empty())
    files = sorted(p for p in delta if not p.startswith(ENTRIES))
    require(bool(files) or args.context_only, "Primero prepara los archivos con git add; para una entrada sin cambios usa --context-only.")
    now = datetime.now(timezone.utc)
    entry_id = now.strftime("%Y%m%dT%H%M%SZ") + "-" + args.actor + "-" + uuid.uuid4().hex[:8]
    entry = {
        "version": 1, "id": entry_id, "at": now.isoformat().replace("+00:00", "Z"),
        "actor": args.actor, "operator": args.operator, "tool": args.tool,
        "task": args.task, "summary": args.summary, "result": args.result,
        "files": files, "decisions": args.decision, "adr_refs": args.adr,
        "ontology_review": args.ontology, "validation": args.validation,
        "next_steps": args.next,
    }
    path = root() / ENTRIES / (entry_id + ".json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(path.relative_to(root())))
    print("Revisa la entrada y añádela con git add antes del commit.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    check = sub.add_parser("check")
    check.add_argument("--staged", action="store_true")
    check.add_argument("--base")
    check.add_argument("--head", default="HEAD")
    sub.add_parser("pre-push")
    sub.add_parser("install")
    sub.add_parser("status")
    rec = sub.add_parser("record")
    for flag in ("actor", "operator", "tool", "task", "summary", "result", "ontology"):
        rec.add_argument("--" + flag, required=True)
    for flag in ("decision", "validation", "next"):
        rec.add_argument("--" + flag, required=True, action="append")
    rec.add_argument("--adr", action="append", default=[])
    rec.add_argument("--context-only", action="store_true", help="Permite registrar una decisión o corrección sin cambiar otros archivos.")
    args = parser.parse_args()
    try:
        if args.command == "install":
            git("config", "--local", "core.hooksPath", ".githooks")
            print("Hooks instalados para esta copia del repositorio.")
        elif args.command == "record":
            record(args)
        elif args.command == "status":
            print(git("status", "--short", "--branch").decode(), end="")
            print("Entradas recientes:")
            for path in sorted((root() / ENTRIES).glob("*.json"))[-10:]:
                entry = json.loads(path.read_text(encoding="utf-8"))
                print(f"{entry['at']} | {entry['actor']} | {entry['task']} | {entry['summary']}")
        elif args.command == "pre-push":
            pre_push()
            print("OK: código, contexto y árbol de trabajo completos.")
        elif args.staged:
            staged_check()
            print("OK: snapshot preparado y bitácora coherentes.")
        else:
            check_range(args.base, args.head)
            print("OK: historial, código y contexto coherentes.")
    except (Invalid, UnicodeError, KeyError, TypeError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
