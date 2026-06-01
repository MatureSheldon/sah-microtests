"""Repository-root path resolution for question-bank agent jobs."""

from __future__ import annotations

from pathlib import Path

# tools/question_bank_agent/src/path_utils.py -> repo root is three levels up
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
AGENT_ROOT = REPO_ROOT / "tools" / "question_bank_agent"


def resolve_repo_path(relative: str | Path) -> Path:
    """Resolve a path relative to the repository root."""
    path = Path(relative)
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


def require_file(relative: str | Path, label: str) -> Path:
    path = Path(relative)
    if not path.is_absolute():
        path = resolve_repo_path(relative)
    else:
        path = path.resolve()
    if not path.is_file():
        raise FileNotFoundError(f"{label} not found: {path}")
    return path


def require_dir(relative: str | Path, label: str) -> Path:
    path = resolve_repo_path(relative)
    if not path.is_dir():
        raise FileNotFoundError(f"{label} not found: {path}")
    return path


def ensure_parent_dir(relative: str | Path) -> Path:
    path = resolve_repo_path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path
