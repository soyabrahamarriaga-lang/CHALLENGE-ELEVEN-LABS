"""Pruebas de integración con repositorios temporales reales, sin red."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "harness.py"
spec = importlib.util.spec_from_file_location("harness", SCRIPT)
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class HarnessTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_cwd = Path.cwd()
        os.chdir(self.temp.name)
        self.repo = Path.cwd()
        self.run_git("init", "-b", "main")
        self.run_git("config", "user.name", "Harness Test")
        self.run_git("config", "user.email", "harness@example.invalid")
        self.run_git("config", "commit.gpgsign", "false")
        self.run_git("config", "core.hooksPath", "/dev/null")
        for path in h.REQUIRED:
            self.write(path, "fixture\n")
        self.write_json("context/actors.json", {"version": 1, "actors": [{"id": "codex", "kind": "agent", "name": "Codex"}]})
        self.model = {"version": 1, "entities": [{"id": "task", "name": "Task", "definition": "Work", "evidence": "Fixture", "status": "confirmed"}], "relations": [], "invariants": ["Traceable"], "open_questions": []}
        self.write_json("context/ontology.json", self.model)
        self.entry("initial", list(h.REQUIRED), adr=True)
        self.run_git("add", ".")
        h.staged_check()
        self.run_git("commit", "-m", "initial")
        self.base = self.run_git("rev-parse", "HEAD").strip()

    def tearDown(self):
        os.chdir(self.old_cwd)
        self.temp.cleanup()

    def run_git(self, *args):
        p = subprocess.run(["git", *args], text=True, capture_output=True)
        if p.returncode:
            self.fail(p.stderr)
        return p.stdout

    def write(self, path, value):
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(value, bytes):
            p.write_bytes(value)
        else:
            p.write_text(value, encoding="utf-8")

    def write_json(self, path, value):
        self.write(path, json.dumps(value))

    def entry(self, ident, files, adr=False, **updates):
        data = {"version": 1, "id": ident, "at": "2026-10-03T19:00:00Z", "actor": "codex", "operator": "test", "tool": "unittest", "task": "test", "summary": "Test entry", "result": "Observed", "files": files, "decisions": ["Keep fixture small"], "adr_refs": ["context/decisions/ADR-0001.md"] if adr else [], "ontology_review": "Model unchanged", "validation": ["Fixture setup"], "next_steps": ["Continue"]}
        data.update(updates)
        self.write_json(h.ENTRIES + ident + ".json", data)

    def stage_change(self, name="next", path="app.py", content="print('hello')\n"):
        self.write(path, content)
        self.entry(name, [path])
        self.run_git("add", ".")

    def test_valid_initial_and_second_commit(self):
        h.check_range(None, "HEAD")
        self.stage_change()
        h.staged_check()
        self.run_git("commit", "-m", "next")
        h.check_range(self.base, "HEAD")

    def test_missing_entry(self):
        self.write("app.py", "print(1)\n")
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "entrada NUEVA"):
            h.staged_check()

    def test_missing_file_coverage(self):
        self.stage_change()
        self.write("README.md", "New documentation\n")
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "sin documentar.*README"):
            h.staged_check()

    def test_binary_and_non_utf8_are_rejected(self):
        for content in (b"abc\0def", b"\xff\xfe"):
            with self.subTest(content=content):
                self.stage_change(content=content)
                with self.assertRaises(h.Invalid):
                    h.staged_check()

    def test_snapshot_uses_staged_bytes(self):
        self.stage_change(content=b"wrong\0content")
        self.write("app.py", "fixed but not staged\n")
        with self.assertRaisesRegex(h.Invalid, "binario"):
            h.staged_check()

    def test_worktree_changes_do_not_replace_index(self):
        self.stage_change()
        self.write("app.py", b"unstaged\0binary")
        h.staged_check()
        with self.assertRaisesRegex(h.Invalid, "pendientes|modificados"):
            h.clean_check()

    def test_generated_folder(self):
        self.stage_change(path="node_modules/example/index.js")
        with self.assertRaisesRegex(h.Invalid, "generado"):
            h.staged_check()

    def test_lfs_pointer(self):
        self.stage_change(content="version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 100\n")
        with self.assertRaisesRegex(h.Invalid, "LFS"):
            h.staged_check()

    def test_symlink(self):
        Path("shortcut").symlink_to("README.md")
        self.entry("next", ["shortcut"])
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "enlaces"):
            h.staged_check()

    def test_entry_edit_and_deletion_are_rejected(self):
        self.entry("initial", list(h.REQUIRED), adr=True, summary="Rewrite")
        self.entry("next", [h.ENTRIES + "initial.json"])
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "inmutable"):
            h.staged_check()
        Path(h.ENTRIES + "initial.json").unlink()
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "inmutable"):
            h.staged_check()

    def test_dangling_ontology_relation(self):
        self.model["relations"] = [{"from": "task", "to": "missing", "type": "uses", "meaning": "Test"}]
        self.write_json("context/ontology.json", self.model)
        self.entry("next", ["context/ontology.json"], adr=True)
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "entidad inexistente"):
            h.staged_check()

    def test_ontology_change_requires_adr(self):
        self.model["open_questions"] = ["New uncertainty"]
        self.write_json("context/ontology.json", self.model)
        self.entry("next", ["context/ontology.json"])
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "enlazar un ADR"):
            h.staged_check()

    def test_unknown_actor(self):
        self.stage_change()
        self.entry("next", ["app.py"], actor="unknown")
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "actor no registrado"):
            h.staged_check()

    def test_history_detects_binary_added_then_deleted(self):
        self.stage_change(name="bad", content=b"bad\0binary")
        self.run_git("commit", "-m", "bad historical object")
        Path("app.py").unlink()
        self.entry("removed", ["app.py"])
        self.run_git("add", ".")
        self.run_git("commit", "-m", "remove binary")
        with self.assertRaisesRegex(h.Invalid, "binario"):
            h.check_range(self.base, "HEAD")

    def test_untracked_files_block_push(self):
        self.write("forgotten.md", "Important context\n")
        with self.assertRaisesRegex(h.Invalid, "sin seguimiento"):
            h.clean_check()

    def test_context_only_correction(self):
        self.entry("correction", [], decisions=["Correction to initial: precise statement"])
        self.run_git("add", ".")
        h.staged_check()

    def test_required_context_cannot_disappear(self):
        Path("docs/CHALLENGE.md").unlink()
        self.entry("next", ["docs/CHALLENGE.md"])
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "Falta el archivo requerido"):
            h.staged_check()

    def test_pre_push_checks_actual_ref_range(self):
        self.stage_change()
        self.run_git("commit", "-m", "next")
        sha = self.run_git("rev-parse", "HEAD").strip()
        old_stdin = h.sys.stdin
        try:
            h.sys.stdin = io.StringIO(f"refs/heads/main {sha} refs/heads/main {self.base}\n")
            h.pre_push()
        finally:
            h.sys.stdin = old_stdin

    def test_text_svg_allowed_and_large_file_rejected(self):
        self.stage_change(path="diagram.svg", content='<svg xmlns="http://www.w3.org/2000/svg"/>\n')
        h.staged_check()
        self.write("diagram.svg", "a" * (h.MAX_BYTES + 1))
        self.run_git("add", ".")
        with self.assertRaisesRegex(h.Invalid, "excede"):
            h.staged_check()

    def test_record_cli_covers_staged_files(self):
        self.write("app.py", "print(1)\n")
        self.run_git("add", "app.py")
        p = subprocess.run(["python3", str(SCRIPT), "record", "--actor", "codex", "--operator", "test", "--tool", "test", "--task", "task", "--summary", "Summary", "--result", "Result", "--decision", "Reason", "--ontology", "Unchanged", "--validation", "Test", "--next", "Next"], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        path = p.stdout.splitlines()[0]
        entry = json.loads(Path(path).read_text())
        self.assertEqual(entry["files"], ["app.py"])
        self.run_git("add", path)
        h.staged_check()


if __name__ == "__main__":
    unittest.main()
