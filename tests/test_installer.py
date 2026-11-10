import ast
import hashlib
import io
import os
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import urllib.request
import zipfile
import shutil

from installer_security import plan_archive

ROOT = Path(__file__).resolve().parents[1]


def wizard_function(name):
    """Load the actual installer function without requiring a graphical Tk runtime."""
    tree = ast.parse((ROOT / "wizard.py").read_text())
    if name == "flatten_zip_prefix":
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)
    else:
        cls = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "GNWizard")
        function = next(node for node in cls.body if isinstance(node, ast.FunctionDef) and node.name == name)
    scope = dict(os=os, hashlib=hashlib, tempfile=tempfile, urllib=SimpleNamespace(request=urllib.request),
                 zipfile=zipfile, shutil=shutil, plan_archive=plan_archive,
                 KEEP_DIRS={"node_modules"}, KEEP_ON_UPDATE={"config.txt", "license_session.json"})
    if name != "flatten_zip_prefix":
        scope["flatten_zip_prefix"] = wizard_function("flatten_zip_prefix")
    exec(compile(ast.Module(body=[function], type_ignores=[]), "wizard.py", "exec"), scope)
    return scope[name]


def archive(entries):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as output:
        for name, value in entries:
            output.writestr(name, value)
    buffer.seek(0)
    return zipfile.ZipFile(buffer)


class ArchiveTests(unittest.TestCase):
    def test_traversal_windows_paths_and_special_names_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            for name in ["../outside", "nested/../../outside", "/absolute", "C:/evil", "C:evil", "\\\\host\\file", "a/..\\evil", "file:stream", "CON", "nul.txt", "folder./x", "folder /x"]:
                with self.subTest(name=name), archive([(name, b"x")]) as zipped:
                    with self.assertRaises(ValueError):
                        plan_archive(zipped, folder)

    def test_symlinks_duplicate_case_and_existing_symlinks_are_rejected(self):
        link = zipfile.ZipInfo("link")
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        with tempfile.TemporaryDirectory() as folder:
            for entries in [[(link, b"outside")], [("index.js", b"a"), ("INDEX.JS", b"b")]]:
                with archive(entries) as zipped, self.assertRaises(ValueError):
                    plan_archive(zipped, folder)
            Path(folder, "link").symlink_to(Path(folder))
            with archive([("link/file", b"x")]) as zipped, self.assertRaises(ValueError):
                plan_archive(zipped, folder)

    def test_full_preflight_prevents_partial_install_of_a_bad_archive(self):
        extract = wizard_function("_extract_zip")
        with tempfile.TemporaryDirectory() as folder:
            zipped = Path(folder, "source.zip")
            destination = Path(folder, "install")
            destination.mkdir()
            Path(destination, "index.js").write_text("original")
            with zipfile.ZipFile(zipped, "w") as output:
                output.writestr("index.js", "replacement")
                output.writestr("../outside", "bad")
            with self.assertRaises(ValueError):
                extract(None, zipped, destination, False)
            self.assertEqual(Path(destination, "index.js").read_text(), "original")

    def test_normal_wrapped_archive_installs_and_preserves_user_configuration(self):
        extract = wizard_function("_extract_zip")
        with tempfile.TemporaryDirectory() as folder:
            zipped = Path(folder, "source.zip")
            destination = Path(folder, "install")
            destination.mkdir()
            Path(destination, "config.txt").write_text("private")
            with zipfile.ZipFile(zipped, "w") as output:
                output.writestr("GNTools-client/index.js", "updated")
                output.writestr("GNTools-client/config.txt", "default")
            extract(None, zipped, destination, True)
            self.assertEqual(Path(destination, "index.js").read_text(), "updated")
            self.assertEqual(Path(destination, "config.txt").read_text(), "private")


class DownloadTests(unittest.TestCase):
    def setUp(self):
        self.download = wizard_function("_download")
        self.wizard = SimpleNamespace(progress_var=SimpleNamespace(get=lambda: 0), update_progress=lambda *args: None)

    def response(self, value, size=None):
        response = io.BytesIO(value)
        response.headers = {"Content-Length": str(len(value) if size is None else size)}
        return response

    def test_wrong_hash_and_truncated_download_preserve_existing_runtime(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder, "node.exe")
            target.write_bytes(b"original")
            for size, digest in [(None, "0" * 64), (100, None)]:
                with patch.object(urllib.request, "urlopen", return_value=self.response(b"new", size)):
                    with self.assertRaises(ValueError):
                        self.download(self.wizard, "https://nodejs.org/test", target, "test", digest)
                self.assertEqual(target.read_bytes(), b"original")
                self.assertEqual(sorted(p.name for p in Path(folder).iterdir()), ["node.exe"])

    def test_valid_hash_replaces_the_runtime_atomically(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder, "node.exe")
            with patch.object(urllib.request, "urlopen", return_value=self.response(b"new")):
                self.download(self.wizard, "https://nodejs.org/test", target, "test", hashlib.sha256(b"new").hexdigest())
            self.assertEqual(target.read_bytes(), b"new")


if __name__ == "__main__":
    unittest.main()
