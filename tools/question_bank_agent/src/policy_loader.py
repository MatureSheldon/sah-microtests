"""Load class/subject policy YAML files (generic, not class-specific)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from path_utils import require_file


def load_policy_yaml(relative_path: str) -> dict[str, Any]:
    path = require_file(relative_path, "Policy YAML")
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def subject_key_from_policy(subject_policy_path: str) -> str:
    """Bank / sheet subject name (e.g. Maths) from policy YAML."""
    data = load_policy_yaml(subject_policy_path)
    return str(data.get("subject") or data.get("display_name") or "").strip()


def subject_display_from_policy(subject_policy_path: str, fallback: str) -> str:
    data = load_policy_yaml(subject_policy_path)
    return str(data.get("display_name") or data.get("subject") or fallback).strip()


def id_prefix_from_policy(subject_policy_path: str, class_level: str) -> str | None:
    data = load_policy_yaml(subject_policy_path)
    raw = data.get("id_prefix")
    if raw:
        return str(raw).strip()
    return None


def derive_id_prefix(class_level: str, subject_key: str) -> str:
    """Fallback ID prefix when policy does not define one."""
    letters = "".join(ch for ch in subject_key if ch.isalpha())
    code = (letters[:3] if len(letters) >= 3 else letters.ljust(3, "X")).upper()
    return f"{code}{class_level}"


def enforce_maths_case_format_from_policy(subject_policy_path: str) -> bool:
    data = load_policy_yaml(subject_policy_path)
    case = data.get("case_source_based")
    if isinstance(case, dict) and case.get("sub_parts"):
        return True
    return False
