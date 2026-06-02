"""Resolve provider/model/mode from repo-root .env plus optional job overrides."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from env_config import get_llm_setting

TASK_PROVIDER_KEY = {
    "planning": "LLM_PLANNING_PROVIDER",
    "generation": "LLM_GENERATION_PROVIDER",
    "review": "LLM_REVIEW_PROVIDER",
    "repair": "LLM_REPAIR_PROVIDER",
    "asset_generation": "LLM_ASSET_PROVIDER",
    "consolidation": "LLM_PLANNING_PROVIDER",
}

TASK_MODEL_KEY = {
    "planning": "LLM_PLANNING_MODEL",
    "generation": "LLM_GENERATION_MODEL",
    "review": "LLM_REVIEW_MODEL",
    "repair": "LLM_REPAIR_MODEL",
    "asset_generation": "LLM_ASSET_MODEL",
    "consolidation": "LLM_PLANNING_MODEL",
}


@dataclass
class RoutedModel:
    provider: str
    model: str
    confirmation_mode: str
    fallback_provider: str | None
    fallback_model: str | None


def _task_pref_model(prefs: Any | None, task_type: str) -> str | None:
    if not prefs:
        return None
    return {
        "planning": prefs.planning_model,
        "generation": prefs.generation_model,
        "review": prefs.review_model,
        "repair": prefs.repair_model,
        "asset_generation": prefs.asset_generation_model,
        "consolidation": prefs.consolidation_model,
    }.get(task_type)


def route_model(
    task_type: str,
    *,
    prefs: Any | None = None,
    legacy_model: str | None = None,
) -> RoutedModel:
    provider = (
        (prefs.provider if prefs and prefs.provider else None)
        or get_llm_setting(TASK_PROVIDER_KEY.get(task_type, ""), None)
        or get_llm_setting("LLM_PROVIDER", "openai")
        or "openai"
    ).strip().lower()
    if provider not in ("openai", "gemini"):
        raise RuntimeError(f"Unsupported provider {provider!r}. Use openai or gemini.")

    model = (
        legacy_model
        or _task_pref_model(prefs, task_type)
        or get_llm_setting(TASK_MODEL_KEY.get(task_type, ""), None)
        or get_llm_setting("LLM_MODEL", None)
    )
    if not model:
        if provider == "openai":
            model = "gpt-4o"
        else:
            model = "gemini-2.5-flash"

    confirmation_mode = (
        (prefs.confirmation_mode if prefs and prefs.confirmation_mode else None)
        or get_llm_setting("MODEL_CONFIRMATION_MODE", "interactive")
        or "interactive"
    ).strip().lower()
    if confirmation_mode not in ("interactive", "auto", "fail_closed"):
        confirmation_mode = "interactive"

    fallback_provider = (get_llm_setting("LLM_FALLBACK_PROVIDER", None) or "").strip().lower() or None
    fallback_model = (get_llm_setting("LLM_FALLBACK_MODEL", None) or "").strip() or None

    return RoutedModel(
        provider=provider,
        model=model.strip(),
        confirmation_mode=confirmation_mode,
        fallback_provider=fallback_provider,
        fallback_model=fallback_model,
    )
