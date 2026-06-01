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
  src/agents/                # agent implementations
```

## Setup

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/question_bank_agent/requirements.txt
```

## Validate a workbook

```sh
python tools/question_bank_agent/validate_workbook.py path/to/class-9-science.xlsx
```

Exit code `0` = pass; `1` = validation errors.

## Outputs

Write final `.xlsx` files to `outputs/workbooks/` (gitignored).

## Schema

Column order and rules: `schema.py`, [SKILL.md](../../skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md), [AGENTS.md](../../AGENTS.md).
