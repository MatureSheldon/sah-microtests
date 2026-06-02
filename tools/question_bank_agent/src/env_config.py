"""Central .env-only configuration loader for the SAH question-bank engine."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import dotenv_values

from path_utils import REPO_ROOT

ENV_PATH = REPO_ROOT / ".env"

_KEY_NAMES = ("OPENAI_API_KEY", "GEMINI_API_KEY")


def _shell_value(name: str) -> str | None:
    import os

    value = os.environ.get(name)
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


@lru_cache(maxsize=1)
def load_repo_env() -> dict[str, str]:
    """Load repo-root .env as the single source of truth."""
    if not ENV_PATH.is_file():
        raise RuntimeError(
            "Repo-root .env is missing. This engine requires .env-only configuration and "
            "will not use inherited shell/Cursor/system environment variables."
        )
    raw = dotenv_values(ENV_PATH)
    return {k: str(v).strip() for k, v in raw.items() if v is not None and str(v).strip() != ""}


def get_optional_env(name: str, default: str | None = None) -> str | None:
    return load_repo_env().get(name, default)


def get_required_env(name: str) -> str:
    value = get_optional_env(name)
    if value:
        return value
    raise RuntimeError(
        f"{name} is missing from repo-root .env. This engine is configured to use .env-only "
        "settings and will not use inherited shell/Cursor/system values."
    )


def get_llm_setting(name: str, default: str | None = None) -> str | None:
    return get_optional_env(name, default)


def inherited_key_warnings() -> list[str]:
    """Detect inherited shell keys and report whether they are ignored/overridden."""
    warnings: list[str] = []
    env_data = load_repo_env()
    for key_name in _KEY_NAMES:
        inherited = _shell_value(key_name)
        from_env = env_data.get(key_name)
        if inherited and not from_env:
            warnings.append(
                f"Inherited {key_name} detected in shell/Cursor/system environment but ignored "
                "because repo-root .env does not define it."
            )
        elif inherited and from_env and inherited != from_env:
            warnings.append(
                f"Inherited {key_name} differs from repo-root .env. Using .env value."
            )
    return warnings


def get_llm_api_key(provider: str) -> str:
    provider = provider.strip().lower()
    env_data = load_repo_env()

    if provider == "openai":
        key_name = "OPENAI_API_KEY"
        value = env_data.get(key_name)
        if value:
            inherited = _shell_value(key_name)
            if inherited and inherited != value:
                print(
                    f"Warning: inherited {key_name} differs from repo-root .env. Using .env value."
                )
            return value
        if _shell_value(key_name):
            print(
                f"Warning: inherited {key_name} was detected but ignored because repo-root .env is "
                "the only API-key source.",
            )
        raise RuntimeError(
            "OPENAI_API_KEY is missing from repo-root .env. This engine is configured to use "
            ".env-only API keys and will not use inherited shell/Cursor/system keys."
        )

    if provider == "gemini":
        key_name = "GEMINI_API_KEY"
        value = env_data.get(key_name)
        if value:
            inherited = _shell_value(key_name)
            if inherited and inherited != value:
                print(
                    f"Warning: inherited {key_name} differs from repo-root .env. Using .env value."
                )
            return value
        if _shell_value(key_name):
            print(
                f"Warning: inherited {key_name} was detected but ignored because repo-root .env is "
                "the only API-key source.",
            )
        raise RuntimeError(
            "GEMINI_API_KEY is missing from repo-root .env. This engine is configured to use "
            ".env-only API keys and will not use inherited shell/Cursor/system keys."
        )

    raise RuntimeError(f"Unsupported LLM provider {provider!r}. Use openai or gemini.")


def mask_secret(value: str | None) -> str:
    if not value:
        return "(missing)"
    if len(value) <= 8:
        return value[:2] + "***"
    return value[:4] + "..." + value[-4:]
