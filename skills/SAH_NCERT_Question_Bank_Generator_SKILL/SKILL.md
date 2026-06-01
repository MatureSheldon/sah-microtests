---
name: sah-ncert-question-bank-generator
description: >-
  Generates, reviews, retrofits, validates, and consolidates SAH NCERT-aligned
  question banks from textbooks into Excel workbooks. Use when creating question
  banks from NCERT textbooks, chapter questions, subject workbooks, asset columns,
  or SAH schema validation for Scholars Academic Home microtests.
---

# SAH NCERT Question Bank Generator

Read [AGENTS.md](../../AGENTS.md) first. All automation stays in **sah-microtests** only.

## Purpose

Turn NCERT (or school-aligned) textbook content into rows that match the SAH Microtests question schema, including **same-row asset columns**, then deliver **one validated Excel workbook per subject**.

## Final output

| Requirement | Value |
|-------------|--------|
| File | One `.xlsx` per subject |
| Sheet name | `Questions` |
| Rows | All chapters for that subject in **one** sheet |
| Sort | `Chapter No.` ascending, then stable within-chapter order |
| Gate | `Use in Papers` = `Yes` for production rows |
| Validate | **Before** writing final workbook |

Do **not** create a separate `Question Assets` sheet. Diagrams, tables, and figures belong in asset columns on the same row.

## Column schema (exact order)

Use these headers. Do not rename, omit, or reorder for final Excel output.

```text
Question ID
Class
Subject
Chapter No.
Chapter
Topic
Subtopic
Difficulty
Question Type
Question Style
Marks
Question
Option A
Option B
Option C
Option D
Correct Answer
Answer / Solution
Explanation
Learning Outcome
NCERT Reference
Source Type
PYQ Year
PYQ Board/Exam
PYQ Paper/Set
Use in Papers
Times Asked
Last Asked Date
Last Paper ID
Last Updated
Notes
Image URL
Asset Format
Asset Data
Asset Placement
Asset Width
Asset Height
```

Canonical reference: `google-apps-script/Code.gs` (`QUESTION_FIELDS` + `rowToQuestion` asset fields). Example rows: `public/fallback-bank.json`.

## Question Type and Question Style

**Question Type** (board buckets):

- MCQ
- Assertion-Reason
- Very Short Answer
- Short Answer
- Long Answer
- Case/Source-Based

**Question Style** (pattern):

- Direct Recall, Conceptual, Application, Reasoning, Competency-Based
- Numerical, Diagram-Based, Data/Table-Based, Experiment/Activity-Based, Visual/Figure-Based

## Question ID pattern

```text
{SUBJABBREV}{CLASS}-CH{NN}-{TYPECODE}-{SEQ}
```

Example: `SCI9-CH01-MCQ-001`, `MTH9-CH03-NCERT-002`. IDs must be unique within the subject workbook.

## Source types

- `NCERT Textbook Question` — Activities, Pause and Ponder, in-text prompts (faithful to textbook where required).
- `Original NCERT-aligned` — SAH-authored, grounded in chapter content.
- PYQ fields when applicable.

**NCERT Reference** example: `Class 9 Science, Chapter 1, Activity 1.1`

## Asset columns (required when a question needs a visual)

Store assets on the **same row** as the question:

| Column | Usage |
|--------|--------|
| `Asset Format` | e.g. `png`, `svg`, `mermaid`, `table` |
| `Asset Data` | URL, base64, embedded SVG, or structured table text per project convention |
| `Asset Placement` | `Before Question` (default), `After Question`, `Inline` |
| `Asset Width` | pixels (default 300 if omitted) |
| `Asset Height` | pixels (default 300 if omitted) |
| `Image URL` | Legacy external URL when `Asset Data` is not used |

Never offload assets to another sheet or file without also filling the row columns the PWA reads.

## Maths — Case/Source-Based

For **Subject = Maths** and **Question Type = Case/Source-Based**:

- Sub-parts labeled exactly **(i)**, **(ii)**, **(iii)** in the question stem.
- Marks allocation: **1 + 1 + 2** (total 4).

## Workflow

1. **Inputs** — class, subject, chapter list, textbook sections (PDF/text).
2. **Plan** — topics/subtopics, type mix, NCERT lifts vs originals; save approved plans under `approved_plans/` when directed.
3. **Draft rows** — per chapter; assign IDs, types, styles, marks, assets.
4. **Validate** — schema, IDs, MCQ options, marks, Maths case format, `Use in Papers`, KaTeX-safe text, asset columns.
5. **Consolidate** — merge all chapters into one `Questions` sheet; sort by `Chapter No.`
6. **Write workbook** — `tools/question_bank_agent/outputs/{class}-{subject}.xlsx` (gitignored until user commits intentionally).

## Validation checklist

- [ ] Headers match schema exactly
- [ ] All chapters present; sorted by `Chapter No.`
- [ ] Unique `Question ID` values
- [ ] `Use in Papers` = `Yes` for bank-ready rows
- [ ] MCQs: four options + `Correct Answer`
- [ ] Marks consistent with type (incl. Maths case 1+1+2)
- [ ] Assets only in same-row columns
- [ ] No separate Question Assets sheet

## Additional resources

- PWA + Sheets integration: `PROJECT_CONTEXT.md`, `README.md`
- Live Apps Script mapping: `google-apps-script/Code.gs`
