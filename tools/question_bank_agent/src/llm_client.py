"""Shared OpenAI structured-output helper."""

from __future__ import annotations

import json
import os
from typing import TypeVar

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from path_utils import REPO_ROOT

T = TypeVar("T", bound=BaseModel)

load_dotenv(REPO_ROOT / ".env")


def get_client() -> OpenAI:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to .env at the repository root or export it in your shell."
        )
    return OpenAI()


def structured_completion(
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_model: type[T],
) -> T:
    client = get_client()
    schema = response_model.model_json_schema()
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
    raw = response.choices[0].message.content
    if not raw:
        raise RuntimeError("OpenAI returned an empty response")
    return response_model.model_validate(json.loads(raw))
