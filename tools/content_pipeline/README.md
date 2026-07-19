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
