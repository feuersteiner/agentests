"""Offline privacy/preservation checks for explicit evidence packaging."""

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location("evidence", Path(__file__).with_name("evidence.py"))
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)


class EvidenceTest(unittest.TestCase):
    def test_pack_preserves_sources_redacts_exports_and_omits_environment(self):
        with tempfile.TemporaryDirectory() as folder:
            source, private = Path(folder) / "run", Path(folder) / "private"
            source.mkdir()
            private.mkdir()
            original = b"OPENAI_API_KEY=" + b"x" * 30
            (source / "transcript.txt").write_bytes(original)
            (source / ".env").write_text("do not open")
            with patch.object(evidence, "verify_private"):
                result = evidence.pack(source, private, "v2", "batch")
                with self.assertRaisesRegex(ValueError, "already exists"):
                    evidence.pack(source, private, "v2", "batch")
            self.assertEqual((source / "transcript.txt").read_bytes(), original)
            self.assertEqual(result["files"], 1)
            self.assertEqual(result["credential_redactions"], 1)
            manifest = json.loads((private / "manifests/v2/batch.json").read_text())
            self.assertEqual(manifest["omitted"], [".env"])
            self.assertEqual(manifest["inventory"][0]["source_sha256"], evidence.digest(original))
            with zipfile.ZipFile(private / "archives/v2/batch.zip") as archive:
                self.assertNotIn(b"x" * 30, archive.read("transcript.txt"))

    def test_public_visibility_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            private = Path(folder)
            (private / ".git").mkdir()
            with patch.object(evidence.subprocess, "check_output", side_effect=[
                evidence.PRIVATE_URL + "\n", json.dumps({"isPrivate": False})
            ]):
                with self.assertRaisesRegex(ValueError, "must be private"):
                    evidence.verify_private(private)

    def test_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            source, private = Path(folder) / "run", Path(folder) / "private"
            source.mkdir()
            private.mkdir()
            (source / "link").symlink_to("/etc/hosts")
            with patch.object(evidence, "verify_private"):
                with self.assertRaisesRegex(ValueError, "Symlinks"):
                    evidence.pack(source, private, "v2", "batch")
            self.assertFalse((private / "archives/v2/batch.zip").exists())


if __name__ == "__main__":
    unittest.main()
