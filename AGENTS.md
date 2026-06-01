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

Generated outputs under `tools/question_bank_agent/outputs/` are gitignored. **`approved_plans/` is not ignored** — commit approved plans when the user asks.
