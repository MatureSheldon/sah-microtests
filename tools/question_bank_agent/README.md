# SAH Question Bank Agent Tooling

Python helpers and agent layout for NCERT question-bank generation.

## Layout

```text
policies/classes/          # e.g. class_9.yaml
policies/subjects/           # e.g. mathematics.yaml, science.yaml
sources/question_bank/       # chapter inputs per class/subject
tools/question_bank_agent/
  jobs/                      # job JSON definitions
  approved_plans/            # tracked approved direction files
  outputs/plans/             # generated plans (gitignored)
  outputs/workbooks/         # final .xlsx (gitignored)
  src/                       # generic engine (plan, generate, validate, xlsx)
```

## Setup

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/question_bank_agent/requirements.txt
```

## .env-only API key policy

The engine reads LLM credentials and model settings from **repo-root `.env` only**.

- It intentionally ignores inherited shell/Cursor/system API keys.
- It does not read keys from code, job JSON, policies, skills, or prompts.
- If `.env` is missing, the run fails.
- If the provider key is missing in `.env`, the run fails.
- If inherited keys are detected, they are ignored and reported.
- `.env` must never be committed.

## Plan a subject (direction only)

```sh
python tools/question_bank_agent/src/plan_subject.py tools/question_bank_agent/jobs/class9_maths_plan.json
```

Writes `outputs/plans/*_direction.json` and `.md` with `approved_direction: false`.

## Generate a subject workbook

1. Review the plan, copy to `approved_plans/`, set `"approved_direction": true`.
2. Run:

```sh
python tools/question_bank_agent/src/generate_subject.py tools/question_bank_agent/jobs/class9_maths_generate.json
```

Requires an API key in repo-root `.env` (see **Model / provider configuration** below).

## Model / provider configuration

The engine supports **OpenAI** and **Gemini**. Task-specific models can differ by ROI (planning vs generation vs review).

### Environment variables

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | `openai` or `gemini` (default `openai`) |
| `LLM_MODEL` | Default model if task-specific var unset |
| `LLM_PLANNING_MODEL` | Model for `plan_subject` (planning) |
| `LLM_GENERATION_MODEL` | Model for `generate_subject` (generation) |
| `LLM_REVIEW_MODEL` | Model for review/repair tasks |
| `LLM_FALLBACK_PROVIDER` | Optional fallback provider on quota errors |
| `LLM_FALLBACK_MODEL` | Optional fallback model on quota errors |
| `MODEL_CONFIRMATION_MODE` | `interactive` (default), `auto`, or `fail_closed` |
| `OPENAI_API_KEY` | OpenAI key |
| `OPENAI_MODEL` | Optional OpenAI default alias |
| `GEMINI_API_KEY` | Gemini key |
| `GEMINI_MODEL` | Optional Gemini default alias |

All variables are resolved from repo-root `.env` via `src/env_config.py` / `src/model_router.py`.

### Local OpenAI example

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_PLANNING_MODEL=gpt-4o-mini
LLM_GENERATION_MODEL=gpt-4o
MODEL_CONFIRMATION_MODE=interactive
```

Planning can often use a **cheaper/faster** model; generation usually needs a **stronger** model; review/repair needs **high precision**.

### Local Gemini example

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
LLM_PLANNING_MODEL=gemini-2.0-flash
LLM_GENERATION_MODEL=gemini-2.0-pro
MODEL_CONFIRMATION_MODE=interactive
```

### Model ROI checkpoint (terminal)

Before each planning or generation run, the CLI prints a **Model ROI checkpoint** (in `interactive` mode):

```text
Model ROI checkpoint
Task type:           planning | generation | ...
Current provider:    openai | gemini
Current model:       ...
Estimated workload:  ...
Quality sensitivity: ...
Cost sensitivity:    ...
Recommended profile: provider/model
Reason:              ...
Options: 1 Continue | 2 Switch model | 3 Switch provider/model | 4 Abort
```

- **`interactive`** — prompts you to choose (default for local runs).
- **`auto`** — uses `.env` / job settings without prompting.
- **`fail_closed`** — stops unless the job JSON includes `model_preferences.confirmed_model_choice: true`.

### Optional job overrides

```json
"model_preferences": {
  "provider": "gemini",
  "planning_model": "gemini-2.0-flash",
  "generation_model": "gemini-2.0-pro",
  "confirmation_mode": "interactive",
  "confirmed_model_choice": false
}
```

### Quota / rate limits

If a call fails due to quota or rate limits, the CLI explains how to change `.env` or `model_preferences`. In `interactive` mode, if `LLM_FALLBACK_PROVIDER` and `LLM_FALLBACK_MODEL` are set, it asks whether to retry with the fallback (no silent retry unless `MODEL_CONFIRMATION_MODE=auto`).

Task profiles and recommendations: `config/model_profiles.yaml`.

## Check configuration

Run:

```sh
python tools/question_bank_agent/src/check_llm_config.py
```

It reports:
- whether repo-root `.env` was found
- selected provider
- planning/generation/review model routing
- masked key presence for OpenAI and Gemini
- inherited shell/Cursor/system keys detected and ignored

## Validate a workbook

```sh
python tools/question_bank_agent/validate_workbook.py path/to/workbook.xlsx
```

Or use the shared engine module: `tools/question_bank_agent/src/validator.py`.

Exit code `0` = pass; `1` = validation errors.

## Outputs

Write final `.xlsx` files to `outputs/workbooks/` (gitignored).

## Schema

Column order and rules: `schema.py`, [SKILL.md](../../skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md), [AGENTS.md](../../AGENTS.md).
