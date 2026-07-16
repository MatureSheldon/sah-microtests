# SAH Content Workbook Tools

Reusable helpers for building class-subject courseware workbooks from the
aggregate CSV files used by the SAH Command app.

## Subject Workbook Layout

Each subject workbook folder should contain these CSV files:

- `Chapter_Map.csv`
- `Topic_Map.csv`
- `Lesson_Plans.csv`
- `Concepts.csv`
- `Homework.csv`
- `Resources.csv`
- `Questions.csv`

The generated Excel workbook keeps the same sheet names and can be pasted into
the matching Google Sheet tabs for the app gateway.

`Concepts.csv` supports lesson visuals through `visual_type` and `visual_data`.
`Questions.csv` uses the title-case asset columns from the question-bank schema:
`Asset Format`, `Asset Data`, `Asset Placement`, `Asset Width`, and
`Asset Height`.

`Homework.csv` supports the same idea with snake-case columns:
`asset_format`, `asset_data`, `asset_placement`, `asset_width`, and
`asset_height`. Use `mermaid` in the format column when generated homework
needs a diagram, flowchart, cycle, table-like graph, or food web.

## Build A Workbook

```bash
NODE_PATH=/Users/adityabhatt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/adityabhatt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
tools/content_workbook/build_subject_workbook.mjs \
--source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Science/generated/subject-workbook \
--class 8 \
--subject Science \
--subject-id SCI
```

By default, the output file is written inside the source folder as:

`class-08-science-subject-workbook.xlsx`

## Validate A Workbook

```bash
python3 tools/question_bank_agent/validate_workbook.py \
/Users/adityabhatt/Documents/SAH_Content_Library/class-08/Science/generated/subject-workbook/class-08-science-subject-workbook.xlsx
```

Temporary `.inspect.ndjson` files may be produced by the spreadsheet renderer.
They are diagnostic output, not source content. Keep them only when debugging a
specific workbook rendering issue.
