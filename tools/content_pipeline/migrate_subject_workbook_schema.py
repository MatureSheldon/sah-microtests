#!/usr/bin/env python3
"""Migrate a SAH subject workbook CSV folder to the current quality schema."""

from __future__ import annotations

import argparse
import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from validate_subject_workbook import ALL_FILES


def read_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_rows(base: Path, sheet: str, rows: list[dict[str, str]], backup_suffix: str) -> None:
    filename, headers = ALL_FILES[sheet]
    path = base / filename
    if path.exists():
        shutil.copy2(path, path.with_suffix(path.suffix + backup_suffix))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header, "") for header in headers})


def cognitive_skill(question_type: str, difficulty: str) -> str:
    if question_type in {"MCQ", "Very Short Answer"}:
        return "Recall" if difficulty == "Easy" else "Reasoning"
    if question_type == "Long Answer":
        return "Synthesis"
    if question_type == "Case/Source-Based":
        return "Application"
    return "Reasoning"


def mastery_band(difficulty: str) -> str:
    return {"Easy": "Must Know", "Medium": "Should Know", "Hard": "Stretch"}.get(difficulty, "Should Know")


def migrate(source_dir: Path, *, overwrite_quality_sheets: bool) -> dict[str, int]:
    chapters = read_rows(source_dir / "Chapter_Map.csv")
    topics = read_rows(source_dir / "Topic_Map.csv")
    lessons = read_rows(source_dir / "Lesson_Plans.csv")
    concepts = read_rows(source_dir / "Concepts.csv")
    homework = read_rows(source_dir / "Homework.csv")
    resources = read_rows(source_dir / "Resources.csv")
    questions = read_rows(source_dir / "Questions.csv")

    by_chapter: dict[str, list[dict[str, str]]] = {}
    for topic in topics:
        by_chapter.setdefault(topic.get("chapter_id", ""), []).append(topic)
    for chapter_topics in by_chapter.values():
        chapter_topics.sort(key=lambda row: int(float(row.get("sequence_no") or 0)))
        total = len(chapter_topics)
        must_cutoff = max(1, round(total * 0.6))
        for index, topic in enumerate(chapter_topics, start=1):
            topic.setdefault("mastery_band", "")
            if not topic["mastery_band"]:
                topic["mastery_band"] = "Must Know" if index <= must_cutoff else ("Should Know" if index < total else "Stretch")
            topic["struggle_status"] = topic.get("struggle_status", "")
            topic["historical_difficulty"] = topic.get("historical_difficulty", "")
            topic.setdefault("prerequisite_topic_ids", "")
            if not topic["prerequisite_topic_ids"] and index > 1:
                topic["prerequisite_topic_ids"] = chapter_topics[index - 2].get("topic_id", "")
            topic["teacher_review_status"] = topic.get("teacher_review_status") or "ai_reviewed"

    for concept in concepts:
        title = (concept.get("concept_title") or "this idea").lower()
        concept["local_example"] = concept.get("local_example") or (
            f"Ask students to make one classroom or home example for {title} and explain which numbers, shapes, or measurements represent the idea."
        )
        concept["teacher_review_status"] = concept.get("teacher_review_status") or "ai_reviewed"

    for row in homework:
        prompt = (row.get("question_text") or "").lower()
        row["homework_kind"] = row.get("homework_kind") or ("Error Correction" if "wrong solution" in prompt or "mistake" in prompt else "Explore")
        row["estimated_minutes"] = row.get("estimated_minutes") or ("20" if row["homework_kind"] == "Error Correction" else "25")
        row["core_concept_coverage"] = row.get("core_concept_coverage") or row.get("topic_id", "")

    for row in questions:
        row["Cognitive Skill"] = row.get("Cognitive Skill") or cognitive_skill(row.get("Question Type", ""), row.get("Difficulty", ""))
        row["Mastery Band"] = row.get("Mastery Band") or mastery_band(row.get("Difficulty", ""))
        row["Revision Link"] = row.get("Revision Link") or ""
        if not row.get("Quality Tags"):
            tags = ["microtest-ready", "ai-reviewed"]
            if row.get("Asset Format"):
                tags.append("visual")
            if row.get("Question Type") == "Case/Source-Based":
                tags.append("case-based")
            row["Quality Tags"] = "; ".join(tags)

    concept_by_topic = {concept.get("topic_id", ""): concept for concept in concepts}
    existing_worked = read_rows(source_dir / "Worked_Examples.csv")
    if existing_worked and not overwrite_quality_sheets:
        worked = existing_worked
    else:
        worked = []
        for topic in topics:
            topic_id = topic.get("topic_id", "")
            title = topic.get("topic_title", "")
            concept = concept_by_topic.get(topic_id, {})
            worked.append({
                "worked_example_id": "WE_" + topic_id,
                "chapter_id": topic.get("chapter_id", ""),
                "topic_id": topic_id,
                "example_title": f"Worked example: {title}",
                "problem": f"Use a simple classroom example to solve a representative problem on {title.lower()}.",
                "step_by_step_solution": f"Step 1: Identify the quantities, shape, or pattern in the problem. Step 2: Choose the representation linked to {title.lower()}. Step 3: apply the chapter idea carefully. Step 4: check the answer against the original condition and explain why it is reasonable.",
                "answer": (concept.get("explanation", "")[:220] or f"The answer should correctly apply {title}."),
                "common_mistake": f"Students may use a remembered shortcut for {title.lower()} without checking when that shortcut is valid.",
                "teacher_note": "Use this after the concept explanation, then ask students to create a parallel example with changed numbers or a changed diagram.",
                "visual_type": concept.get("visual_type", ""),
                "visual_data": concept.get("visual_data", ""),
                "status": "active",
            })

    existing_review = read_rows(source_dir / "Teacher_Review.csv")
    if existing_review and not overwrite_quality_sheets:
        teacher_review = existing_review
    else:
        teacher_review = []
        for chapter in chapters:
            chapter_id = chapter.get("chapter_id", "")
            teacher_review.append({
                "review_id": "REV_" + chapter_id,
                "scope_type": "chapter",
                "scope_id": chapter_id,
                "chapter_id": chapter_id,
                "topic_id": "",
                "review_status": "needs_human_review",
                "quality_score": "",
                "reviewer": "",
                "review_notes": "Check chapter coverage, classroom language, visual usefulness, homework depth, worked examples, and whether microtest questions give enough swap options.",
                "last_reviewed": "",
            })

    suffix = ".bak-schema-v2-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    for sheet, rows in [
        ("Chapter_Map", chapters),
        ("Topic_Map", topics),
        ("Lesson_Plans", lessons),
        ("Concepts", concepts),
        ("Homework", homework),
        ("Resources", resources),
        ("Questions", questions),
        ("Worked_Examples", worked),
        ("Teacher_Review", teacher_review),
    ]:
        write_rows(source_dir, sheet, rows, suffix)

    return {
        "Chapter_Map": len(chapters),
        "Topic_Map": len(topics),
        "Lesson_Plans": len(lessons),
        "Concepts": len(concepts),
        "Homework": len(homework),
        "Resources": len(resources),
        "Questions": len(questions),
        "Worked_Examples": len(worked),
        "Teacher_Review": len(teacher_review),
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Migrate SAH subject workbook CSVs to the current quality schema.")
    parser.add_argument("--source-dir", required=True, type=Path, help="Folder containing subject workbook CSV files.")
    parser.add_argument("--overwrite-quality-sheets", action="store_true", help="Regenerate Worked_Examples and Teacher_Review even if they already exist.")
    args = parser.parse_args(list(argv) if argv is not None else None)
    counts = migrate(args.source_dir.expanduser().resolve(), overwrite_quality_sheets=args.overwrite_quality_sheets)
    for sheet, count in counts.items():
        print(f"{sheet}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
