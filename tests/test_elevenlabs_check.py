"""Seguridad del acceso directo sin llamadas reales ni credenciales reales."""
import importlib.util
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location("eleven_check", Path(__file__).resolve().parents[1] / "scripts" / "elevenlabs_check.py")
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class ElevenLabsCheckTest(unittest.TestCase):
    def test_no_key_does_not_request_network(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {}, clear=True), patch.object(client, "get_json") as get:
            with self.assertRaises(client.AccessError):
                client.load_key(Path(tmp) / ".env")
            get.assert_not_called()

    def test_local_file_parses_without_executing_shell(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {}, clear=True):
            path = Path(tmp) / ".env"
            path.write_text('# local\nELEVENLABS_API_KEY="test-only-key"\n')
            self.assertEqual(client.load_key(path), "test-only-key")

    def test_environment_has_precedence(self):
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "test-env"}):
            self.assertEqual(client.load_key(), "test-env")

    def test_duplicate_keys_rejected(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {}, clear=True):
            path = Path(tmp) / ".env"
            path.write_text('ELEVENLABS_API_KEY=first\nELEVENLABS_API_KEY=second\n')
            with self.assertRaises(client.AccessError):
                client.load_key(path)

    def test_http_error_does_not_reveal_body(self):
        error = HTTPError("https://api.elevenlabs.io", 403, "test-only-secret", {}, io.BytesIO(b"test-only-secret"))
        opener = MagicMock()
        opener.open.side_effect = error
        with patch.object(client, "build_opener", return_value=opener):
            with self.assertRaises(client.AccessError) as caught:
                client.get_json("test-only-secret", "/v1/convai/agents")
        self.assertNotIn("test-only-secret", str(caught.exception))
        request = opener.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.full_url, "https://api.elevenlabs.io/v1/convai/agents")

    def test_redirect_never_forwards_credentials(self):
        self.assertIsNone(client.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.invalid"))

    def test_pagination_and_private_metadata_omission(self):
        pages = [{"agents": [{"agent_id": "a", "name": "A", "access_info": {"creator_email": "private@example.invalid"}}], "has_more": True, "next_cursor": "next"}, {"agents": [], "has_more": False}]
        with patch.object(client, "get_json", side_effect=pages) as get:
            result = client.agents("test")
        self.assertEqual(len(result), 1)
        self.assertNotIn("access_info", result[0])
        self.assertEqual(get.call_args.args[2]["cursor"], "next")

    def test_config_omits_prompt_and_tool_secrets(self):
        payload = {"conversation_config": {"agent": {"prompt": {"llm": "example-model", "prompt": "private system prompt", "tools": [{"secret": "private-token"}]}}, "tts": {"model_id": "example-voice"}}}
        with patch.object(client, "get_json", return_value=payload):
            result = client.agent_config("test", "agent_example")
        self.assertEqual(result["llm"], "example-model")
        self.assertEqual(result["tool_count"], 1)
        self.assertNotIn("private", str(result))


if __name__ == "__main__":
    unittest.main()
