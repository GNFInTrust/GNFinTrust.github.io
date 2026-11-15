"""Preflight every ZIP entry before installing any files."""
import os
import re
import stat
from pathlib import Path

MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024
RESERVED = re.compile(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", re.I)


def plan_archive(archive, install_dir, prefix=""):
    root = Path(install_dir).resolve()
    plan = []
    seen = set()
    total = 0
    for entry in archive.infolist():
        name = entry.filename.replace("\\", "/")
        parts = name.rstrip("/").split("/")
        if (name.startswith("/") or any(
            part in ("", ".", "..") or ":" in part or "\x00" in part
            or part.endswith((".", " ")) or RESERVED.match(part)
            for part in parts
        )):
            raise ValueError("Unsafe archive path: " + name)
        if stat.S_ISLNK(entry.external_attr >> 16):
            raise ValueError("Archive symlinks are not allowed")
        total += entry.file_size
        if total > MAX_ARCHIVE_BYTES or entry.file_size > 128 * 1024 * 1024:
            raise ValueError("Archive is too large")
        if name.startswith("__MACOSX/") or entry.is_dir():
            continue
        rel = name[len(prefix):] if prefix and name.startswith(prefix) else name
        if not rel:
            continue
        destination = root / rel
        resolved = destination.resolve()
        if not resolved.is_relative_to(root) or resolved == root:
            raise ValueError("Archive path escapes installation folder")
        # Reject existing symlinks even if they currently point inside the root.
        probe = destination
        while probe != root:
            if probe.is_symlink():
                raise ValueError("Installation path contains a symlink")
            probe = probe.parent
        key = str(destination).casefold()
        if key in seen:
            raise ValueError("Duplicate archive path: " + name)
        seen.add(key)
        plan.append((entry, rel, os.fspath(destination)))
    return plan
