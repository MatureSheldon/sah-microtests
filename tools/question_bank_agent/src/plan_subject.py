#!/usr/bin/env python3
"""Produce a subject-level direction plan from a planning job JSON."""

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
    estimate_plan_workload,
    resolve_model_selection,
    run_roi_checkpoint,
)
from path_utils import ensure_parent_dir, require_file, resolve_repo_path
from policy_loader import (
    derive_id_prefix,
    enforce_maths_case_format_from_policy,
    id_prefix_from_policy,
    subject_display_from_policy,
    subject_key_from_policy,
)
from schemas import ChapterDirection, PlanSubjectJob, SubjectDirectionPlan

SYSTEM_PROMPT = """You are the SAH NCERT question-bank planning agent for Scholars Academic Home.
You produce subject-level DIRECTION plans only. You do NOT write full exam questions.
Follow class and subject policies. Use clear, encouraging, age-appropriate language.
Output JSON matching the provided schema exactly."""


def load_text(relative: str, label: str) -> str:
    path = require_file(relative, label)
    return path.read_text(encoding="utf-8")


def direction_to_markdown(plan: SubjectDirectionPlan) -> str:
    lines = [
        f"# Direction plan — Class {plan.class_level} {plan.subject_display or plan.subject}",
        "",
        f"- **Approved direction:** {plan.approved_direction}",
        f"- **ID prefix:** {plan.id_prefix}",
        "",
    ]
    if plan.planning_notes:
        lines.extend([plan.planning_notes, ""])

    for ch in plan.chapters:
        lines.extend(
            [
                f"## Chapter {ch.chapter_no}: {ch.chapter_title}",
                "",
                f"- **Source:** `{ch.source_path}`",
                "",
                "### Core concepts",
                *[f"- {c}" for c in ch.core_concepts],
                "",
                "### Skills to test",
                *[f"- {s}" for s in ch.skills_to_test],
                "",
                "### Good contexts",
                *[f"- {c}" for c in ch.good_contexts],
                "",
                "### Misconceptions to address",
                *[f"- {m}" for m in ch.misconceptions_to_address],
                "",
                "### Diagram / asset needs",
                *[f"- {d}" for d in ch.diagram_or_asset_needs],
                "",
                "### Avoid",
                *[f"- {a}" for a in ch.avoid],
                "",
                "### Chapter question direction",
                ch.chapter_question_direction,
                "",
                "### Sample question directions",
            ]
        )
        for sample in ch.sample_question_directions:
            lines.append(
                f"- **{sample.question_type}** × {sample.count}: {sample.direction}"
            )
        if ch.target_question_counts:
            lines.extend(
                [
                    "",
                    "### Target question counts",
                    *[f"- {k}: {v}" for k, v in sorted(ch.target_question_counts.items())],
                ]
            )
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def build_user_prompt(job: PlanSubjectJob, skill: str, class_policy: str, subject_policy: str) -> str:
    chapter_blocks: list[str] = []
    for ch in job.chapters:
        source = load_text(ch.source_path, f"Chapter {ch.chapter_no} source")
        chapter_blocks.append(
            f"### Chapter {ch.chapter_no}: {ch.chapter_title}\n"
            f"source_path: {ch.source_path}\n\n"
            f"{source[:12000]}"
        )

    extra = job.planning_notes or ""
    return f"""Create a subject direction plan for:
- class_level: {job.class_level}
- subject: {job.subject}
- subject_display: {job.subject_display or job.subject}
- id_prefix: {job.id_prefix}

Planning notes from job:
{extra}

SKILL (excerpt — follow schema and pedagogy):
{skill[:8000]}

CLASS POLICY:
{class_policy}

SUBJECT POLICY:
{subject_policy}

CHAPTER SOURCES:
{chr(10).join(chapter_blocks)}

For each chapter, fill every direction field including sample_question_directions with
question_type, count, and direction text. Set target_question_counts implicitly via samples.
Do not set approved_direction to true.
"""


def run_plan(job_path: Path) -> SubjectDirectionPlan:
    job_file = require_file(job_path, "Planning job JSON")
    job = PlanSubjectJob.model_validate(json.loads(job_file.read_text(encoding="utf-8")))

    skill = load_text(job.skill_path, "Skill file")
    class_policy = load_text(job.class_policy_path, "Class policy")
    subject_policy = load_text(job.subject_policy_path, "Subject policy")

    user_prompt = build_user_prompt(job, skill, class_policy, subject_policy)

    total_chars = 0
    for ch in job.chapters:
        total_chars += len(load_text(ch.source_path, f"Chapter {ch.chapter_no} source"))
    workload, large = estimate_plan_workload(
        chapter_count=len(job.chapters),
        total_source_chars=total_chars,
    )
    selection = resolve_model_selection(
        "planning",
        prefs=job.model_preferences,
        estimated_workload=workload,
        legacy_model=job.model,
        large_workload=large,
    )
    selection = run_roi_checkpoint(selection)

    plan = structured_completion_with_selection(
        selection,
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=SubjectDirectionPlan,
    )

    # Enforce metadata from job; planning output is never auto-approved.
    chapters: list[ChapterDirection] = []
    job_by_no = {c.chapter_no: c for c in job.chapters}
    for ch in plan.chapters:
        if ch.chapter_no not in job_by_no:
            raise ValueError(f"Plan returned unknown chapter_no {ch.chapter_no}")
        job_ch = job_by_no[ch.chapter_no]
        chapters.append(
            ch.model_copy(
                update={
                    "chapter_title": job_ch.chapter_title,
                    "source_path": job_ch.source_path,
                }
            )
        )

    subject_key = subject_key_from_policy(job.subject_policy_path)
    subject_display = job.subject_display or job.subject or subject_display_from_policy(
        job.subject_policy_path, job.subject
    )
    id_prefix = (
        job.id_prefix
        or id_prefix_from_policy(job.subject_policy_path, job.class_level)
        or derive_id_prefix(job.class_level, subject_key)
    )

    final = SubjectDirectionPlan(
        class_level=job.class_level,
        subject=subject_key,
        subject_display=subject_display,
        approved_direction=False,
        id_prefix=id_prefix,
        chapters=chapters,
        planning_notes=plan.planning_notes or job.planning_notes,
        skill_path=job.skill_path,
        class_policy_path=job.class_policy_path,
        subject_policy_path=job.subject_policy_path,
        enforce_maths_case_format=enforce_maths_case_format_from_policy(job.subject_policy_path),
    )

    json_out = ensure_parent_dir(job.output_direction_json)
    md_out = ensure_parent_dir(job.output_direction_md)
    json_out.write_text(
        json.dumps(final.model_dump(mode="json"), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    md_out.write_text(direction_to_markdown(final), encoding="utf-8")

    print(f"Wrote direction JSON: {json_out}")
    print(f"Wrote direction MD:   {md_out}")
    print("approved_direction=false — review, then copy to approved_plans/ and set approved_direction=true.")
    return final


def main() -> int:
    parser = argparse.ArgumentParser(description="SAH subject direction planner")
    parser.add_argument("job_json", type=Path, help="Path to planning job JSON")
    args = parser.parse_args()

    job_path = args.job_json
    if not job_path.is_absolute():
        job_path = resolve_repo_path(job_path)

    try:
        run_plan(job_path)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
