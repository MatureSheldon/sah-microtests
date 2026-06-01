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

## Plan a subject (direction only)

```sh
python tools/question_bank_agent/src/plan_subject.py tools/question_bank_agent/jobs/class_9_maths_plan.json
```

Writes `outputs/plans/*_direction.json` and `.md` with `approved_direction: false`.

## Generate a subject workbook

1. Review the plan, copy to `approved_plans/`, set `"approved_direction": true`.
2. Run:

```sh
python tools/question_bank_agent/src/generate_subject.py tools/question_bank_agent/jobs/class_9_maths_generate.json
```

Requires `OPENAI_API_KEY` in repo-root `.env`.

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
