"""Local filesystem object storage for workspace assets."""

from __future__ import annotations

import re
from pathlib import Path
from uuid import UUID

_SAFE_SEGMENT = re.compile(r"[^a-zA-Z0-9._-]+")


def _root(base: str) -> Path:
    return Path(base).expanduser().resolve()


def asset_rel_key(user_id: str, asset_id: UUID, filename: str) -> str:
    """DB object_key: posix relative path under blob root."""
    raw = filename or "file"
    base = Path(raw).name
    safe = _SAFE_SEGMENT.sub("_", base)[:180] if base else "file"
    if not safe or safe.startswith("."):
        safe = "file" + (safe if safe else "")
    return f"{user_id}/{asset_id!s}/{safe}"


def abs_path(blob_root: str, object_key: str) -> Path:
    root = _root(blob_root)
    candidate = (root / object_key).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as e:
        raise OSError("invalid object_key") from e
    return candidate


def save_bytes(blob_root: str, object_key: str, data: bytes) -> None:
    path = abs_path(blob_root, object_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def read_bytes(blob_root: str, object_key: str) -> bytes:
    path = abs_path(blob_root, object_key)
    if not path.is_file():
        raise FileNotFoundError(object_key)
    return path.read_bytes()


def delete_file(blob_root: str, object_key: str) -> None:
    path = abs_path(blob_root, object_key)
    if path.is_file():
        path.unlink()
    try:
        root = _root(blob_root)
        for parent in path.parents:
            if parent == root:
                break
            if parent.is_dir() and not any(parent.iterdir()):
                parent.rmdir()
    except OSError:
        pass
