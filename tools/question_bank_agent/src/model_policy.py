"""Model/provider resolution and ROI checkpoints for question-bank LLM tasks."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict

from env_config import get_llm_setting
from model_router import route_model
from path_utils import REPO_ROOT

TASK_TYPES = (
    "planning",
    "generation",
    "review",
    "repair",
    "asset_generation",
    "consolidation",
)

ConfirmationMode = Literal["interactive", "auto", "fail_closed"]

CONFIG_PATH = REPO_ROOT / "tools" / "question_bank_agent/config/model_profiles.yaml"


class ModelPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planning_model: str | None = None
    generation_model: str | None = None
    review_model: str | None = None
    repair_model: str | None = None
    asset_generation_model: str | None = None
    consolidation_model: str | None = None
    provider: str | None = None
    confirmation_mode: ConfirmationMode | None = None
    confirmed_model_choice: bool = False


@dataclass
class ModelSelection:
    task_type: str
    provider: str
    model: str
    confirmation_mode: ConfirmationMode
    confirmed: bool
    estimated_workload: str
    quality_sensitivity: str
    cost_sensitivity: str
    recommended_provider: str
    recommended_model: str
    reason: str
    large_workload_warning: bool = False


def _load_profiles() -> dict[str, Any]:
    path = CONFIG_PATH
    if not path.is_file():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _env_confirmation_mode() -> ConfirmationMode:
    raw = (get_llm_setting("MODEL_CONFIRMATION_MODE", "interactive") or "interactive").strip().lower()
    if raw in ("interactive", "auto", "fail_closed"):
        return raw  # type: ignore[return-value]
    return "interactive"

def _default_model_for_provider(provider: str, profiles: dict[str, Any]) -> str:
    defaults = profiles.get("defaults") or {}
    if provider == "gemini":
        return (
            get_llm_setting("GEMINI_MODEL", None)
            or get_llm_setting("LLM_MODEL", None)
            or defaults.get("gemini_model")
            or "gemini-2.0-flash"
        )
    return (
        get_llm_setting("OPENAI_MODEL", None)
        or get_llm_setting("LLM_MODEL", None)
        or defaults.get("openai_model")
        or "gpt-4o"
    )


def _recommended_for_task(task_type: str, provider: str, profiles: dict[str, Any]) -> tuple[str, str, str, str]:
    task_cfg = (profiles.get("task_types") or {}).get(task_type) or {}
    quality = str(task_cfg.get("quality_sensitivity") or "medium")
    cost = str(task_cfg.get("cost_sensitivity") or "medium")
    reason = str(task_cfg.get("reason") or "No profile reason configured.")
    rec = task_cfg.get("recommended") or {}
    rec_provider = provider if provider in ("openai", "gemini") else "openai"
    rec_model = str(rec.get(rec_provider) or _default_model_for_provider(rec_provider, profiles))
    return quality, cost, reason, rec_model


def resolve_model_selection(
    task_type: str,
    *,
    prefs: ModelPreferences | None = None,
    estimated_workload: str = "",
    legacy_model: str | None = None,
    large_workload: bool = False,
) -> ModelSelection:
    if task_type not in TASK_TYPES:
        raise ValueError(f"Unknown task_type {task_type!r}. Expected one of {TASK_TYPES}")

    profiles = _load_profiles()
    routed = route_model(task_type, prefs=prefs, legacy_model=legacy_model)
    provider = routed.provider
    model = routed.model or _default_model_for_provider(provider, profiles)

    quality, cost, reason, rec_model = _recommended_for_task(task_type, provider, profiles)
    confirmation_mode = routed.confirmation_mode if routed.confirmation_mode else _env_confirmation_mode()
    confirmed = bool(prefs and prefs.confirmed_model_choice)

    return ModelSelection(
        task_type=task_type,
        provider=provider,
        model=model.strip(),
        confirmation_mode=confirmation_mode,
        confirmed=confirmed,
        estimated_workload=estimated_workload or "not estimated",
        quality_sensitivity=quality,
        cost_sensitivity=cost,
        recommended_provider=provider,
        recommended_model=rec_model,
        reason=reason,
        large_workload_warning=large_workload,
    )


def _print_checkpoint_header(selection: ModelSelection) -> None:
    print("\nModel ROI checkpoint")
    print(f"Task type:           {selection.task_type}")
    print(f"Current provider:    {selection.provider}")
    print(f"Current model:       {selection.model}")
    print(f"Estimated workload:  {selection.estimated_workload}")
    print(f"Quality sensitivity: {selection.quality_sensitivity}")
    print(f"Cost sensitivity:    {selection.cost_sensitivity}")
    print(f"Recommended profile: {selection.recommended_provider}/{selection.recommended_model}")
    print(f"Reason:              {selection.reason}")
    if selection.large_workload_warning:
        print("Warning:             Large/expensive workload — consider a cheaper model for planning or batching.")
    print(
        "\nOptions:\n"
        "  1. Continue with current model\n"
        "  2. Switch model\n"
        "  3. Switch provider/model\n"
        "  4. Abort"
    )


def _roi_differs(selection: ModelSelection) -> bool:
    return (
        selection.model != selection.recommended_model
        or selection.provider != selection.recommended_provider
    )


def run_roi_checkpoint(selection: ModelSelection) -> ModelSelection:
    """Interactive/auto/fail_closed gate before an LLM call."""
    if selection.confirmation_mode == "fail_closed" and not selection.confirmed:
        raise RuntimeError(
            "MODEL_CONFIRMATION_MODE=fail_closed requires "
            "model_preferences.confirmed_model_choice=true in the job JSON."
        )

    if selection.confirmation_mode == "auto":
        if _roi_differs(selection):
            print(
                f"\nModel ROI checkpoint (auto): using {selection.provider}/{selection.model} "
                f"(recommended {selection.recommended_provider}/{selection.recommended_model})."
            )
        return selection

    # interactive
    _print_checkpoint_header(selection)
    if selection.large_workload_warning or _roi_differs(selection):
        print(
            "\nModel ROI checkpoint: This task may be better suited to a different model/provider. "
            f"Current setting is {selection.provider}/{selection.model}."
        )

    while True:
        choice = input("Choose [1-4]: ").strip()
        if choice == "1":
            selection.confirmed = True
            return selection
        if choice == "2":
            new_model = input("New model name: ").strip()
            if new_model:
                selection.model = new_model
                selection.confirmed = True
            return selection
        if choice == "3":
            new_provider = input("New provider (openai/gemini): ").strip().lower()
            new_model = input("New model name: ").strip()
            if new_provider in ("openai", "gemini"):
                selection.provider = new_provider
            if new_model:
                selection.model = new_model
            selection.confirmed = True
            return selection
        if choice == "4":
            print("Aborted by user at model ROI checkpoint.")
            sys.exit(1)
        print("Invalid choice. Enter 1, 2, 3, or 4.")


def estimate_plan_workload(*, chapter_count: int, total_source_chars: int) -> tuple[str, bool]:
    profiles = _load_profiles()
    large_cfg = profiles.get("large_workload") or {}
    threshold = int(large_cfg.get("planning_chapter_threshold") or 6)
    large = chapter_count >= threshold or total_source_chars > 120_000
    label = f"{chapter_count} chapter(s), ~{total_source_chars // 1000}k source chars"
    return label, large


def estimate_generation_workload(*, chapter_count: int, estimated_questions: int) -> tuple[str, bool]:
    profiles = _load_profiles()
    large_cfg = profiles.get("large_workload") or {}
    ch_th = int(large_cfg.get("generation_chapter_threshold") or 5)
    q_th = int(large_cfg.get("generation_question_threshold") or 80)
    large = chapter_count >= ch_th or estimated_questions >= q_th
    label = f"{chapter_count} chapter(s), ~{estimated_questions} question(s)"
    return label, large


def count_estimated_questions_from_direction(direction_chapters: list[Any]) -> int:
    total = 0
    for ch in direction_chapters:
        counts = getattr(ch, "target_question_counts", None) or {}
        if counts:
            total += sum(int(v) for v in counts.values())
            continue
        for sample in getattr(ch, "sample_question_directions", []) or []:
            total += int(getattr(sample, "count", 1) or 1)
    return total or len(direction_chapters) * 10


def fallback_from_env() -> tuple[str | None, str | None]:
    provider = (get_llm_setting("LLM_FALLBACK_PROVIDER", None) or "").strip().lower() or None
    model = (get_llm_setting("LLM_FALLBACK_MODEL", None) or "").strip() or None
    return provider, model


def ask_fallback_retry(failed_provider: str, failed_model: str) -> ModelSelection | None:
    fb_provider, fb_model = fallback_from_env()
    if not fb_provider or not fb_model:
        return None
    print(
        f"\nThe current provider/model ({failed_provider}/{failed_model}) failed because of "
        "quota or rate limits. You can switch provider/model by changing .env or job model_preferences."
    )
    if _env_confirmation_mode() == "auto":
        print(f"Auto mode: retrying with fallback {fb_provider}/{fb_model}.")
        return ModelSelection(
            task_type="",
            provider=fb_provider,
            model=fb_model,
            confirmation_mode="auto",
            confirmed=True,
            estimated_workload="",
            quality_sensitivity="",
            cost_sensitivity="",
            recommended_provider=fb_provider,
            recommended_model=fb_model,
            reason="fallback",
        )
    answer = input(f"Retry with fallback {fb_provider}/{fb_model}? [y/N]: ").strip().lower()
    if answer not in ("y", "yes"):
        return None
    return ModelSelection(
        task_type="",
        provider=fb_provider,
        model=fb_model,
        confirmation_mode="interactive",
        confirmed=True,
        estimated_workload="",
        quality_sensitivity="",
        cost_sensitivity="",
        recommended_provider=fb_provider,
        recommended_model=fb_model,
        reason="fallback",
    )
