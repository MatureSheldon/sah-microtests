# SAH Content Pipeline

Local tooling for turning generated chapter content into reviewable,
app-ready subject workbooks.

The first implemented piece is the six-pass validator:

1. Schema and relationship validation
2. Concept quality validation
3. Misconception validation
4. Visual asset validation
5. Homework quality validation
6. Question-bank validation

That validator proves workbook structure and baseline content hygiene. It is
not enough to prove teaching quality. Run the pedagogy quality audit as a
separate pass before asking for approval or calling a workbook ready.

## Validate A Subject Workbook Folder

```bash
python3 tools/content_pipeline/validate_subject_workbook.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Science/generated/subject-workbook
```

By default, this writes:

```text
validation-report.md
```

inside the subject workbook folder.

Use `--strict` when warnings should fail the run.

For fast chapter-by-chapter iteration without rebuilding the XLSX workbook:

```bash
python3 tools/content_pipeline/validate_subject_fast.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Science/generated/subject-workbook \
  --strict
```

## Audit Pedagogy Quality And Repetition

Use this subject-agnostic audit to catch repeated/template-like content in
lesson phases, notes, concept text, homework answers, question explanations,
and worked examples:

```bash
python3 tools/content_pipeline/audit_subject_quality.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/English/generated/subject-workbook \
  --strict
```

This writes:

```text
quality-audit-report.md
```

inside the subject workbook folder. A clean schema report with a noisy quality
audit is not ready for teacher review.

## Token-Efficient Source Outlines

Before generating a full subject, create compact outline packets from source
Markdown/text files. These are extractive planning aids, not generated content.

```bash
python3 tools/content_pipeline/extract_subject_outline.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Social\ Science/markdown \
  --exclude-regex 'hees1(ps|cc|gl)\.md$'
```

The tool writes per-chapter outlines plus `subject-outline.md` under
`generated/outlines/` by default. Use these compact files for blueprinting
instead of repeatedly loading full chapters.

## Token Discipline For Generation

Use the smallest context packet that can preserve quality:

- For subject planning, read contents, textbook rationale, chapter titles,
  headings, exercises, and compact outlines.
- When web access is available, run a compact sample-question benchmark scan
  before Chapter 1. Search the exact textbook/class/subject/chapter and a few
  representative later chapters, show the user a small linked sample, and record
  only the reusable quality takeaways. Do not copy online question banks into
  the workbook.
- For Chapter 1, read the full source because it sets the quality benchmark.
- For later chapters, load only the approved strategy, blueprint, Chapter 1
  benchmark summary, current chapter source/brief, and previous chapter when
  continuity matters.
- For validation, read only summary lines and findings first. Inspect full CSV
  rows only for IDs named in a report.
- Do not print full CSVs or full workbook inspection files during normal work.
- Keep XLSX rebuilds for approval checkpoints and final delivery; use fast CSV
  validation and the quality audit for chapter iteration.
- Treat repeated text as both a quality problem and a token problem: if lesson
  phases, notes, homework answers, question explanations, or worked examples
  repeat, fix the generation approach before continuing.

## Sort Workbook CSVs

When replacing a middle chapter, rows may be appended after later chapters.
Before the final XLSX build, sort the workbook CSVs into stable chapter/topic
order:

```bash
python3 tools/content_pipeline/sort_subject_workbook_csvs.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Social\ Science/generated/subject-workbook
```

Use `--check` to verify row order without writing.

## Intended Pipeline

The larger pipeline should eventually run:

```text
source_uploaded
chapter_index_created
draft_generated
workbook_built
machine_validated
ai_reviewed
needs_human_review
teacher_approved
ready_for_sheet_import
imported
```

Generation should remain draft-producing. The validators can gate the workbook
before teacher review, but they should not automatically approve content for
classroom use.


## Schema V2 Quality Layer

The content workbook now keeps the original app-facing sheets and adds a
quality layer for production review. Existing app reads remain compatible
because the original columns are preserved.

Additional columns:

- `Topic_Map`: `struggle_status`, `historical_difficulty`, `mastery_band`, `prerequisite_topic_ids`, `teacher_review_status`
- `Concepts`: `local_example`, `teacher_review_status`
- `Homework`: `homework_kind`, `estimated_minutes`, `core_concept_coverage`
- `Questions`: `Cognitive Skill`, `Mastery Band`, `Revision Link`, `Quality Tags`

Additional optional sheets:

- `Worked_Examples`: solved-problem patterns linked to chapter/topic IDs
- `Teacher_Review`: human review checklist rows and approval status

Migrate an existing subject workbook folder:

```bash
python3 tools/content_pipeline/migrate_subject_workbook_schema.py \
  --source-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-08/Maths/generated/subject-workbook
```

Then rebuild and validate:

```bash
python3 tools/content_pipeline/run_subject_pipeline.py --class 8 --subject Maths --subject-id MATH
```

Central Google control sheets do not need to change for this layer unless the
live app should display review status, mastery filters, or worked examples.


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
8. Ask for Chapter 1 content-quality approval. Generate remaining chapters only
   after explicit approval, validating after each chapter.
