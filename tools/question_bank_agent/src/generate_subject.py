#!/usr/bin/env python3
"""Generate a full subject question-bank workbook from an approved direction plan."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from llm_client import structured_completion_with_selection
from model_policy import (
    ModelSelection,
    count_estimated_questions_from_direction,
    estimate_generation_workload,
    resolve_model_selection,
    run_roi_checkpoint,
)
from path_utils import ensure_parent_dir, require_file, resolve_repo_path
from schemas import (
    GeneratedSubjectBatch,
    GenerateSubjectJob,
    QuestionRow,
    SubjectDirectionPlan,
    sort_questions,
)
from validator import validate_question_rows
from xlsx_writer import write_subject_workbook

SYSTEM_PROMPT = """You are the SAH NCERT question-bank generation agent for Scholars Academic Home.
Write complete question rows that match the SAH Excel schema exactly.
Use KaTeX-safe plain text (e.g. x^2, fractions as a/b).
Store any diagram/table only in same-row asset columns (Asset Format, Asset Data, etc.).
Never reference external sheets. Use in Papers must be Yes for every row.
For Case/Source-Based questions use exactly sub-parts (i), (ii), and (iii) in the stem — never (iv).
When enforce_maths_case_format is true, Case/Source-Based marks must be 4 (1+1+2).
Generate unique Question IDs using the given id_prefix pattern."""


def load_direction(path: str) -> SubjectDirectionPlan:
    file_path = require_file(path, "Approved direction JSON")
    return SubjectDirectionPlan.model_validate(json.loads(file_path.read_text(encoding="utf-8")))


def load_skill_excerpt(skill_path: str | None) -> str:
    if not skill_path:
        return ""
    return require_file(skill_path, "Skill file").read_text(encoding="utf-8")[:6000]


def chapter_prompt(
    *,
    job: GenerateSubjectJob,
    direction: SubjectDirectionPlan,
    chapter_no: int,
    skill_excerpt: str,
) -> str:
    ch = next(c for c in direction.chapters if c.chapter_no == chapter_no)
    targets = ch.target_question_counts or {}
    targets_text = "\n".join(f"- {k}: {v}" for k, v in sorted(targets.items())) or "- follow sample directions"

    samples = "\n".join(
        f"- {s.question_type} × {s.count}: {s.direction}" for s in ch.sample_question_directions
    )

    maths_note = ""
    if job.enforce_maths_case_format:
        maths_note = (
            "\nMaths case format required: Case/Source-Based marks = 4 with sub-parts (i), (ii), (iii).\n"
        )

    return f"""Generate all questions for ONE chapter.

class_level: {job.class_level}
subject: {job.subject}
id_prefix: {job.id_prefix}
chapter_no: {ch.chapter_no}
chapter_title: {ch.chapter_title}
enforce_maths_case_format: {job.enforce_maths_case_format}
{maths_note}

Target counts:
{targets_text}

Chapter direction:
{ch.chapter_question_direction}

Sample question directions:
{samples}

Core concepts: {", ".join(ch.core_concepts)}
Skills: {", ".join(ch.skills_to_test)}
Avoid: {", ".join(ch.avoid)}
Asset needs: {", ".join(ch.diagram_or_asset_needs)}

SKILL excerpt:
{skill_excerpt}

Return one JSON object with a "questions" array. Each item must include all required SAH fields.
Use empty strings for unused PYQ fields. Set Last Updated to today's date (YYYY-MM-DD).
"""


def generate_chapter(
    job: GenerateSubjectJob,
    direction: SubjectDirectionPlan,
    chapter_no: int,
    skill_excerpt: str,
    selection: ModelSelection,
) -> list[QuestionRow]:
    user_prompt = chapter_prompt(
        job=job, direction=direction, chapter_no=chapter_no, skill_excerpt=skill_excerpt
    )

    batch = structured_completion_with_selection(
        selection,
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=GeneratedSubjectBatch,
    )
    return batch.questions


def run_generate(job_path: Path) -> Path:
    job_file = require_file(job_path, "Generation job JSON")
    job = GenerateSubjectJob.model_validate(json.loads(job_file.read_text(encoding="utf-8")))

    direction = load_direction(job.approved_direction_path)
    if not direction.approved_direction:
        raise RuntimeError(
            "approved_direction is false. Review the plan, set approved_direction to true "
            f"in {job.approved_direction_path}, then re-run."
        )

    enforce = (
        job.enforce_maths_case_format
        if job.enforce_maths_case_format is not None
        else direction.enforce_maths_case_format
    )
    job = job.model_copy(
        update={
            "class_level": job.class_level or direction.class_level,
            "subject": job.subject or direction.subject,
            "id_prefix": job.id_prefix or direction.id_prefix,
            "enforce_maths_case_format": enforce,
        }
    )

    if job.class_level != direction.class_level or job.subject != direction.subject:
        raise ValueError(
            "Resolved class/subject does not match approved direction: "
            f"job={job.class_level}/{job.subject} direction={direction.class_level}/{direction.subject}"
        )

    skill_excerpt = load_skill_excerpt(direction.skill_path)

    # One ROI checkpoint for the full generation run (per-chapter calls reuse the same selection).
    est_q = count_estimated_questions_from_direction(direction.chapters)
    workload, large = estimate_generation_workload(
        chapter_count=len(direction.chapters),
        estimated_questions=est_q,
    )
    _generation_selection = resolve_model_selection(
        "generation",
        prefs=job.model_preferences,
        estimated_workload=workload,
        legacy_model=job.model,
        large_workload=large,
    )
    generation_selection = run_roi_checkpoint(_generation_selection)

    all_rows: list[QuestionRow] = []

    for ch in sorted(direction.chapters, key=lambda c: c.chapter_no):
        print(f"Generating chapter {ch.chapter_no}: {ch.chapter_title}…")
        rows = generate_chapter(
            job, direction, ch.chapter_no, skill_excerpt, generation_selection
        )
        all_rows.extend(rows)

    all_rows = sort_questions(all_rows)
    errors = validate_question_rows(
        all_rows,
        direction=direction,
        enforce_maths_case_format=job.enforce_maths_case_format,
    )
    if errors:
        raise ValueError("Validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    out_path = ensure_parent_dir(job.output_path)
    write_subject_workbook(
        out_path,
        all_rows,
        direction=direction,
        enforce_maths_case_format=job.enforce_maths_case_format,
        validation_errors=[],
    )
    print(f"Wrote workbook: {out_path}")
    print(f"Total questions: {len(all_rows)}")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="SAH subject question-bank generator")
    parser.add_argument("job_json", type=Path, help="Path to generation job JSON")
    args = parser.parse_args()

    job_path = args.job_json
    if not job_path.is_absolute():
        job_path = resolve_repo_path(job_path)

    try:
        run_generate(job_path)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
