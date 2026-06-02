#!/usr/bin/env python3
"""Check .env-only LLM configuration for the SAH question-bank engine."""

from __future__ import annotations

from env_config import ENV_PATH, get_llm_setting, inherited_key_warnings, load_repo_env, mask_secret
from model_router import route_model


def main() -> int:
    print("SAH question-bank LLM config check")
    print(f"repo-root .env found: {'yes' if ENV_PATH.is_file() else 'no'}")
    if not ENV_PATH.is_file():
        print("Error: repo-root .env is missing.")
        return 1

    env_data = load_repo_env()
    print(f"provider selected: {get_llm_setting('LLM_PROVIDER', 'openai')}")

    planning = route_model("planning")
    generation = route_model("generation")
    review = route_model("review")
    print(f"planning model: {planning.provider}/{planning.model}")
    print(f"generation model: {generation.provider}/{generation.model}")
    print(f"review model: {review.provider}/{review.model}")

    openai_key = env_data.get("OPENAI_API_KEY")
    gemini_key = env_data.get("GEMINI_API_KEY")
    print(f"OPENAI_API_KEY in .env: {'yes' if openai_key else 'no'} ({mask_secret(openai_key)})")
    print(f"GEMINI_API_KEY in .env: {'yes' if gemini_key else 'no'} ({mask_secret(gemini_key)})")

    warnings = inherited_key_warnings()
    if warnings:
        print("inherited shell/Cursor/system keys detected and ignored:")
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("inherited shell/Cursor/system keys detected and ignored: none")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
