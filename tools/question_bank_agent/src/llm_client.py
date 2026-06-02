"""Multi-provider structured LLM calls (OpenAI, Gemini) with quota-aware fallback."""

from __future__ import annotations

import json
import re
from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel

from env_config import get_llm_api_key
from model_policy import ModelSelection, ask_fallback_retry

T = TypeVar("T", bound=BaseModel)

QUOTA_PATTERN = re.compile(
    r"(quota|rate\s*limit|rate_limit|insufficient_quota|resource_exhausted|429|too many requests)",
    re.IGNORECASE,
)


class LLMError(RuntimeError):
    def __init__(self, message: str, *, is_quota: bool = False, provider: str = "", model: str = ""):
        super().__init__(message)
        self.is_quota = is_quota
        self.provider = provider
        self.model = model


def is_quota_error(exc: BaseException) -> bool:
    text = f"{type(exc).__name__}: {exc}"
    return bool(QUOTA_PATTERN.search(text))


def _openai_client() -> OpenAI:
    try:
        api_key = get_llm_api_key("openai")
    except RuntimeError as exc:
        raise LLMError(str(exc), provider="openai") from exc
    return OpenAI(api_key=api_key)


def _structured_openai(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
) -> T:
    client = _openai_client()
    schema = response_model.model_json_schema()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": response_model.__name__,
                    "schema": schema,
                    "strict": True,
                },
            },
        )
    except Exception as exc:
        raise LLMError(
            str(exc),
            is_quota=is_quota_error(exc),
            provider="openai",
            model=model,
        ) from exc

    raw = response.choices[0].message.content
    if not raw:
        raise LLMError("OpenAI returned an empty response", provider="openai", model=model)
    return response_model.model_validate(json.loads(raw))


def _structured_gemini(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
) -> T:
    try:
        api_key = get_llm_api_key("gemini")
    except RuntimeError as exc:
        raise LLMError(str(exc), provider="gemini") from exc

    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise LLMError(
            "google-generativeai is not installed. Run: pip install google-generativeai",
            provider="gemini",
        ) from exc

    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
    )
    schema = response_model.model_json_schema()

    try:
        response = gemini_model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
    except Exception as exc:
        raise LLMError(
            str(exc),
            is_quota=is_quota_error(exc),
            provider="gemini",
            model=model,
        ) from exc

    raw = getattr(response, "text", None) or ""
    if not raw:
        raise LLMError("Gemini returned an empty response", provider="gemini", model=model)
    return response_model.model_validate(json.loads(raw))


def structured_completion(
    *,
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
) -> T:
    provider = provider.strip().lower()
    if provider == "openai":
        return _structured_openai(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
        )
    if provider == "gemini":
        return _structured_gemini(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
        )
    raise LLMError(f"Unsupported provider {provider!r}. Use openai or gemini.", provider=provider, model=model)


def structured_completion_with_selection(
    selection: ModelSelection,
    *,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
) -> T:
    """Call LLM; on quota errors optionally retry with fallback provider/model."""
    try:
        return structured_completion(
            provider=selection.provider,
            model=selection.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
        )
    except LLMError as exc:
        if not exc.is_quota:
            raise
        fallback = ask_fallback_retry(exc.provider or selection.provider, exc.model or selection.model)
        if not fallback:
            raise RuntimeError(
                f"{exc}\n\nThe current provider/model failed because of quota or rate limits. "
                "Switch provider/model via .env (LLM_PROVIDER, LLM_MODEL, LLM_FALLBACK_*) "
                "or job model_preferences."
            ) from exc
        fallback.task_type = selection.task_type
        return structured_completion(
            provider=fallback.provider,
            model=fallback.model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
        )
