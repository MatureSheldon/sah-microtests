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
from validator import (
    extract_passage_and_sub_question,
    get_set_id_from_notes,
    validate_question_rows,
)
from xlsx_writer import write_subject_workbook

SYSTEM_PROMPT = """You are the SAH NCERT question-bank generation agent for Scholars Academic Home.
Write complete question rows that match the SAH Excel schema exactly.
Use KaTeX-safe plain text (e.g. x^2, fractions as a/b).
Store any diagram/table only in same-row asset columns (Asset Format, Asset Data, etc.).
Never reference external sheets. Use in Papers must be Yes for every row.
For MCQ questions, you MUST populate Option A, Option B, Option C, Option D, and Correct Answer (which must be exactly A, B, C, or D) with non-empty values.
For Case/Source-Based questions use exactly sub-parts (i), (ii), and (iii) in the stem — never (iv).
When enforce_maths_case_format is true, Case/Source-Based marks must be 4 (1+1+2).
For English reading comprehension and extract-based questions:
- Group them into linked passage/extract sets.
- Each set must share the exact same passage text.
- Assign a stable, unique Set ID (e.g., ENG9-CH902-SET001) for all questions in that set.
- A set must contain 4 to 8 questions (a mix of MCQ, Very Short Answer, and Short Answer questions as per chapter requirements).
- In the 'Notes' column, you MUST populate this exact metadata structure:
  Set ID: <set_id>
  Stimulus type: <stimulus_type> (e.g., Unseen Passage, Factual Passage, Literature Extract)
  Display rule: show passage once before linked questions in paper generation.
- The first question in the set must start with "Passage: <passage_text>" or "Extract: <extract_text>" followed by two newlines and the actual sub-question prompt.
- For all other questions in the same set, start the Question column with "Passage: [Same as Set]\n\n<question_prompt>" or "Extract: [Same as Set]\n\n<question_prompt>".
- Do not treat repeated passages as duplicate stems if they are part of the same Set ID.
- But still reject duplicate actual question prompts within the same set.
- Do not repeat the exact same sub-question prompt within the same set.
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

Return one JSON object with a "questions" array containing the generated questions.
You MUST generate exactly the number of questions specified in "Target counts" (e.g. if MCQ: 3, Short Answer: 3, and Very Short Answer: 2 are requested, you must generate exactly 8 question objects in the "questions" array). Do not omit any questions.
For each question, fill in all required fields.
For MCQ questions, you MUST populate Option A, Option B, Option C, Option D, and Correct Answer (A/B/C/D).
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

    import time
    for i, ch in enumerate(sorted(direction.chapters, key=lambda c: c.chapter_no)):
        if i > 0:
            print("Rate limit mitigation: sleeping for 15 seconds...")
            time.sleep(15)
        print(f"Generating chapter {ch.chapter_no}: {ch.chapter_title}…")
        rows = generate_chapter(
            job, direction, ch.chapter_no, skill_excerpt, generation_selection
        )
        all_rows.extend(rows)

    # Propagate passage/extract text for linked English sets
    set_passages: dict[str, str] = {}
    for row in all_rows:
        if row.subject.strip().lower() == "english":
            set_id = get_set_id_from_notes(row.notes)
            if set_id:
                passage, _ = extract_passage_and_sub_question(row.question)
                if passage and "[same as set]" not in passage.lower():
                    set_passages[set_id] = passage

    for row in all_rows:
        if row.subject.strip().lower() == "english":
            set_id = get_set_id_from_notes(row.notes)
            if set_id and set_id in set_passages:
                passage, sub_q = extract_passage_and_sub_question(row.question)
                if not passage or "[same as set]" in passage.lower():
                    row.question = f"{set_passages[set_id]}\n\n{sub_q}"

    all_rows = sort_questions(all_rows)
    errors = validate_question_rows(
        all_rows,
        direction=direction,
        enforce_maths_case_format=job.enforce_maths_case_format,
    )
    if errors:
        print("DEBUG: generated rows details:")
        for r in all_rows:
            print(f"ID: {r.question_id}, Type: {r.question_type}, Correct Answer: {r.correct_answer!r}, Options: A={r.option_a!r}, B={r.option_b!r}, C={r.option_c!r}, D={r.option_d!r}")
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
