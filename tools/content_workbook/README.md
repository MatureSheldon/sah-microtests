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


## GeoJSON Visuals

Use `geojson` in visual/asset format columns for schematic geography maps:
regions, routes, rivers, resource distribution, migration paths, and labelled
place questions. Store valid GeoJSON directly in `visual_data`, `asset_data`, or
`Asset Data`. The app renders it as an offline SVG map, so it does not require
Google Maps or internet map tiles.

Use GeoJSON only for map-space. Use SVG for science cycles, nutrient cycles,
geometry, and other non-geographic spatial diagrams. Use Mermaid for timelines,
classification trees, and cause-effect/process chains.

Built-in base maps: `world-outline`, `india-outline`, and `india-political`.
For the smallest sheet rows, put one of these IDs directly in `visual_data` /
`Asset Data`. For overlays, use JSON like:

```json
{
  "base_map": "india-outline",
  "overlays": [
    {
      "type": "Feature",
      "properties": { "name": "River route", "stroke": "#dc2626", "arrow": true },
      "geometry": { "type": "LineString", "coordinates": [[77, 30], [82, 25], [88, 22]] }
    }
  ]
}
```


## New Subject Strategy Gate

Before generating a complete new subject, do not ask the old broad minimum
question list by default. The stable SAH defaults are already known: balanced
explanation plus exam readiness, light local/global context where useful,
mixed assessment styles, age-appropriate and balanced framing, visuals chosen
by topic fit, and Chapter 1 approval before full-subject generation.

Use this context-first gate instead:

1. Ask only the scope/book-context question:
   "What exact books, parts, strands, boards, or uploaded source folders should
   be included in this subject pass?"
2. Inspect the source folder and textbook prelims/contents/intro to understand
   class, subject, book personality, chapter structure, activities, and
   assessment cues.
3. Return with a concise suggested approach before generation. Include included
   sources/books/strands, suggested chapter granularity, inferred content feel,
   teaching balance, assessment shape, visual language, quality risks, and
   review plan.
4. When web access is available, search for sample questions for the exact
   textbook/class/subject/first chapter and 2-3 representative later chapters.
   Show a few linked examples and state what the pipeline will borrow, improve,
   or avoid. Use the scan to calibrate quality, not to copy content.
5. Ask whether the suggested approach/feel is right and whether the user would
   add anything.
6. Ask only 3-5 source-specific pedagogy questions that materially improve this
   book. Do not repeat broad defaults unless the source or user creates real
   uncertainty.
7. Save approved decisions as `subject-strategy.md`, create
   `subject-blueprint.md`, generate Chapter 1 only, and run schema/content
   validation plus repetition/pedagogy quality checks.
8. Fill `chapter-01-quality-gate.md` before asking for approval. The gate should
   record PASS/REVISE status for source grounding, textbook feel, concepts,
   lesson phases, teacher notes, homework, questions, subject question style,
   worked examples, assets, cross-connections, sensitivity, retrievability,
   repetition control, and token discipline.
9. Ask for Chapter 1 content-quality approval. Generate remaining chapters only
   after explicit approval, validating after each chapter.
