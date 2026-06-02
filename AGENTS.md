# SAH Microtests — Agent Instructions

This repository contains:

1. **SAH Microtests** — a zero-server PWA (`public/`) for weekly microtest generation, preview, swap/lock, and Word export.
2. **Internal question-bank generation tooling** — agents, scripts, skills, and validation under `skills/` and `tools/question_bank_agent/`.

All work stays in **this repository** (`sah-microtests`). Do not create or use a separate repository for question-bank automation.

---

## Question-bank work — required reading

For any task involving **generation, review, retrofit, validation, or consolidation** of a question bank, read these files **before** making changes:

1. [skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md](skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md)
2. This file (`AGENTS.md`)

---

## Output contract

| Rule | Detail |
|------|--------|
| **Final deliverable** | One Excel workbook (`.xlsx`) per subject |
| **Sheet layout** | One main sheet named `Questions` |
| **Chapter scope** | All chapters for that subject in the **same** `Questions` sheet |
| **Sort order** | Rows sorted by **Chapter No.** (then stable order within chapter) |
| **Schema** | Preserve the SAH column schema exactly (see skill file) |
| **Assets** | Store in **same-row** asset columns only (`Asset Format`, `Asset Data`, `Asset Placement`, `Asset Width`, `Asset Height`, and legacy `Image URL` when needed) |
| **No separate asset sheet** | Do not create a `Question Assets` sheet or external asset index |
| **Selection gate** | `Use in Papers` = `Yes` for every row intended for the live bank |
| **Validation** | Run validation **before** writing the final workbook |

### Maths — Case/Source-Based

For **Maths** `Case/Source-Based` questions, sub-parts must use exactly **(i)**, **(ii)**, **(iii)** with marks **1 + 1 + 2** (total 4).

---

## PWA integration (downstream)

The microtest app reads question banks from Google Sheets (per-subject tabs) or bundled fallback JSON. Agent-produced Excel workbooks are the **authoring/review** artifact; after approval, rows are imported into the school's Google Sheet using the same column headers.

Reference implementation: `google-apps-script/Code.gs`, `public/fallback-bank.json`.

---

## Git checkpoint policy

After every **major build** or successful implementation step, stop and ask:

> Major build complete. Do you want to commit and push this checkpoint?

**Do not** run `git add`, `git commit`, or `git push` without explicit user approval.

A **major build** includes:

- Creating or modifying agent scripts
- Creating or modifying policies
- Creating or modifying skill files
- Creating or modifying GitHub Actions workflows
- Creating or modifying job JSON files
- Successful local run of planning
- Successful local run of generation
- Approved direction file creation
- Major validation fix

When the user approves, they may run:

```sh
./tools/dev/git_checkpoint.sh
```

---

## Ignored paths

Generated outputs under `tools/question_bank_agent/outputs/` are gitignored. **`tools/question_bank_agent/approved_plans/` is not ignored** — commit approved plans when the user asks.

Policies live under `policies/classes/` and `policies/subjects/`. Source inputs under `sources/question_bank/`.

---

## Model ROI Checkpoint Rule

Before any **major LLM task** in question-bank automation, identify:

1. **task_type** — planning, generation, review, repair, asset_generation, consolidation
2. **current provider** — `openai` or `gemini` (from `.env` or job `model_preferences`)
3. **current model** — resolved per task (e.g. `LLM_PLANNING_MODEL`, `LLM_GENERATION_MODEL`)
4. **expected workload size** — chapters, estimated questions, source size
5. **quality sensitivity** — from `tools/question_bank_agent/config/model_profiles.yaml`
6. **cost sensitivity** — from the same profiles
7. **whether a cheaper, faster, or stronger model may be better** — compare current vs recommended profile

If the **task type changes** or **model ROI changes**, Cursor must stop and ask:

> Model ROI checkpoint: This task may be better suited to a different model/provider. Current setting is [provider/model]. Do you want to continue, switch model, or switch provider?

**Never** silently switch models or providers without explicit approval.

CLI scripts (`plan_subject.py`, `generate_subject.py`) enforce this via `MODEL_CONFIRMATION_MODE` (default `interactive`). See `tools/question_bank_agent/README.md` for `.env` examples.

| Mode | Behaviour |
|------|-----------|
| `interactive` | Prompt before LLM calls (default for local runs) |
| `auto` | Use configured defaults without asking |
| `fail_closed` | Refuse unless job JSON has `model_preferences.confirmed_model_choice: true` |

On **quota/rate-limit** errors, suggest switching provider/model via `.env` or job `model_preferences`; do not retry silently unless mode is `auto` and fallback env vars are set.

---

## API key source of truth

For this repository, **repo-root `.env` is the only source of truth** for LLM credentials and model settings.

- Keys/settings must come from `.env` (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDER`, model variables).
- Do **not** use inherited shell/Cursor/system API keys.
- Do **not** store API keys in code, job JSON, policies, skills, commits, or prompts.
- `.env` must never be committed.

Engine behaviour is intentionally strict:

- If `.env` is missing, fail.
- If required provider key is missing in `.env`, fail.
- If inherited keys exist, they are ignored (with warnings).
- If inherited key differs from `.env`, use `.env` value.
