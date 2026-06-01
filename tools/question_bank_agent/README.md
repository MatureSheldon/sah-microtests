# SAH Question Bank Agent Tooling

Python helpers for validating subject workbooks before handoff to Google Sheets.

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

Write final `.xlsx` files to `outputs/` (gitignored):

```text
tools/question_bank_agent/outputs/{class}-{subject}.xlsx
```

## Schema

Column order and rules: `schema.py`, [SKILL.md](../../skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md), [AGENTS.md](../../AGENTS.md).
