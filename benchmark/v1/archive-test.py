"""Offline regression checks for corpus validation and safe restoration."""

import importlib.util
import io
from pathlib import Path
import zipfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("archive", Path(__file__).with_name("archive.py"))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


class ArchiveTest(unittest.TestCase):
    def setUp(self):
        self.files = [("dataset/example/script.sh", 0o755, b"original\n")]
        self.manifest = {
            "paths": ["dataset"], "excluded": ["dataset/README.md"],
            "contents": archive.inventory(self.files),
        }

    def test_paths_and_modes_are_restricted(self):
        for name in ("/dataset/escape", "dataset/../escape", "dataset//escape",
                     "dataset/./escape", "other/file", "dataset/README.md", "dataset/a\\b"):
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "Unsafe"):
                archive.validate([(name, 0o644, b"")], self.manifest)
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            archive.validate([("dataset/file", 0o777, b"")], self.manifest)

    def test_duplicates_and_changed_bytes_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            archive.validate(self.files * 2, self.manifest)
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            archive.validate([("dataset/example/script.sh", 0o755, b"modified\n")], self.manifest)

    def test_restore_is_exact_idempotent_and_preserves_edits(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            archive.restore(self.files, root)
            target = root / self.files[0][0]
            self.assertEqual(target.read_bytes(), b"original\n")
            self.assertEqual(target.stat().st_mode & 0o777, 0o755)
            archive.restore(self.files, root)
            target.write_bytes(b"edited\n")
            with self.assertRaisesRegex(ValueError, "overwrite changed"):
                archive.restore(self.files, root)
            self.assertEqual(target.read_bytes(), b"edited\n")

    def test_destination_symlink_is_rejected_without_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            outside = root / "outside"
            outside.mkdir()
            destination = root / "restore"
            destination.mkdir()
            (destination / "dataset").symlink_to(outside, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "Symlink"):
                archive.restore(self.files, destination)
            self.assertEqual(list(outside.iterdir()), [])

    def test_corrupt_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "archive.zip"
            target.write_bytes(b"corrupt")
            self.manifest["archive"] = {"sha256": "0" * 64, "bytes": 7}
            with patch.object(archive, "archive_path", return_value=target):
                with self.assertRaisesRegex(ValueError, "Archive checksum mismatch"):
                    archive.read_archive(self.manifest)

    def test_archive_links_and_traversal_are_rejected_before_restore(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "archive.zip"
            for mode, name in ((0o120644, "dataset/link"),
                               (0o100644, "dataset/../escape")):
                with zipfile.ZipFile(target, "w") as z:
                    member = zipfile.ZipInfo(name)
                    member.external_attr = mode << 16
                    z.writestr(member, b"")
                self.manifest["archive"] = {"sha256": archive.sha256(target.read_bytes()),
                                            "bytes": target.stat().st_size}
                with patch.object(archive, "archive_path", return_value=target):
                    with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, "Unsafe"):
                        archive.read_archive(self.manifest)

    def test_reproducible_zip_roundtrip(self):
        with tempfile.TemporaryDirectory() as folder:
            one, two = Path(folder) / "one.zip", Path(folder) / "two.zip"
            archive.write_zip(one, self.files)
            archive.write_zip(two, self.files)
            self.assertEqual(one.read_bytes(), two.read_bytes())
            self.manifest["archive"] = {"sha256": archive.sha256(one.read_bytes()),
                                        "bytes": one.stat().st_size}
            self.assertEqual(archive.read_zip(one, self.manifest), self.files)

    def test_download_checks_bytes_and_does_not_install_corruption(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "fixtures.zip"
            archive.write_zip(target, self.files)
            data = target.read_bytes()
            self.manifest["archive"] = {
                "url": "https://github.com/feuersteiner/agentests/releases/download/test/fixtures.zip",
                "sha256": archive.sha256(data), "bytes": len(data)}
            target.unlink()
            with patch.object(archive, "archive_path", return_value=target):
                with patch.object(archive.urllib.request, "urlopen", return_value=io.BytesIO(b"bad")):
                    with self.assertRaisesRegex(ValueError, "Truncated"):
                        archive.download(self.manifest)
                self.assertFalse(target.exists())
                with patch.object(archive.urllib.request, "urlopen", return_value=io.BytesIO(b"x" * len(data))):
                    with self.assertRaisesRegex(ValueError, "checksum"):
                        archive.download(self.manifest)
                self.assertFalse(target.exists())
                with patch.object(archive.urllib.request, "urlopen", return_value=io.BytesIO(data)):
                    archive.download(self.manifest)
                self.assertEqual(archive.read_zip(target, self.manifest), self.files)



if __name__ == "__main__":
    unittest.main()
