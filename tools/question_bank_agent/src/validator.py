"""Validate SAH question batches against direction plans and schema rules."""

from __future__ import annotations

import re
from collections import Counter, defaultdict

from schemas import (
    ALLOWED_ASSET_FORMATS,
    ALLOWED_ASSET_PLACEMENT,
    ALLOWED_MCQ_ANSWERS,
    ALLOWED_USE_IN_PAPERS,
    MATHS_CASE_MARKS,
    MATHS_CASE_PARTS,
    QUESTION_TYPE_ORDER,
    ChapterDirection,
    QuestionRow,
    SubjectDirectionPlan,
)

CASE_PART_IV = re.compile(r"\(iv\)", re.IGNORECASE)


def normalize_stem(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def validate_question_rows(
    rows: list[QuestionRow],
    *,
    direction: SubjectDirectionPlan | None = None,
    enforce_maths_case_format: bool = False,
) -> list[str]:
    errors: list[str] = []
    if not rows:
        errors.append("No questions to validate")
        return errors

    seen_ids: set[str] = set()
    seen_stems: dict[str, str] = {}
    by_chapter: dict[int, list[QuestionRow]] = defaultdict(list)

    for row in rows:
        by_chapter[row.chapter_no].append(row)

        if row.question_id in seen_ids:
            errors.append(f"Duplicate Question ID: {row.question_id!r}")
        seen_ids.add(row.question_id)

        stem_key = normalize_stem(row.question)
        if stem_key in seen_stems:
            errors.append(
                f"Duplicate question stem for {row.question_id!r} "
                f"(same as {seen_stems[stem_key]!r})"
            )
        else:
            seen_stems[stem_key] = row.question_id

        if row.use_in_papers not in ALLOWED_USE_IN_PAPERS:
            errors.append(f"{row.question_id}: invalid Use in Papers {row.use_in_papers!r}")
        elif row.use_in_papers != "Yes":
            errors.append(f"{row.question_id}: Use in Papers must be Yes for bank rows")

        if row.question_type not in QUESTION_TYPE_ORDER:
            errors.append(f"{row.question_id}: unknown Question Type {row.question_type!r}")

        if row.question_type == "MCQ":
            for label, val in (
                ("Option A", row.option_a),
                ("Option B", row.option_b),
                ("Option C", row.option_c),
                ("Option D", row.option_d),
            ):
                if not val.strip():
                    errors.append(f"{row.question_id}: MCQ missing {label}")
            ans = row.correct_answer.strip().upper()
            if ans not in ALLOWED_MCQ_ANSWERS:
                errors.append(
                    f"{row.question_id}: MCQ Correct Answer must be A/B/C/D, got {row.correct_answer!r}"
                )

        fmt = row.asset_format.strip().lower()
        if fmt and fmt not in ALLOWED_ASSET_FORMATS:
            errors.append(f"{row.question_id}: invalid Asset Format {row.asset_format!r}")
        placement = row.asset_placement.strip()
        if placement and placement not in ALLOWED_ASSET_PLACEMENT:
            errors.append(f"{row.question_id}: invalid Asset Placement {row.asset_placement!r}")
        if fmt and not row.asset_data.strip() and not row.image_url.strip():
            errors.append(
                f"{row.question_id}: Asset Format set but Asset Data and Image URL are empty"
            )

        if row.question_type == "Case/Source-Based":
            if CASE_PART_IV.search(row.question):
                errors.append(f"{row.question_id}: Case/Source-Based must not include (iv)")
            for part in MATHS_CASE_PARTS:
                if part not in row.question:
                    errors.append(f"{row.question_id}: Case/Source-Based missing sub-part {part}")

            if enforce_maths_case_format and row.marks != MATHS_CASE_MARKS:
                errors.append(
                    f"{row.question_id}: Case/Source-Based marks must be {MATHS_CASE_MARKS} "
                    f"(1+1+2), got {row.marks}"
                )

    if direction:
        errors.extend(_validate_against_direction(by_chapter, direction))

    errors.extend(_validate_sort_order(rows))
    return errors


def _validate_against_direction(
    by_chapter: dict[int, list[QuestionRow]],
    direction: SubjectDirectionPlan,
) -> list[str]:
    errors: list[str] = []
    direction_by_no = {c.chapter_no: c for c in direction.chapters}

    for ch_no, ch_dir in direction_by_no.items():
        rows = by_chapter.get(ch_no, [])
        targets = ch_dir.target_question_counts or {}
        if not targets:
            continue
        actual = Counter(r.question_type for r in rows)
        for qtype, expected in targets.items():
            got = actual.get(qtype, 0)
            if got != expected:
                errors.append(
                    f"Chapter {ch_no}: expected {expected} {qtype} question(s), got {got}"
                )

    for ch_no in by_chapter:
        if ch_no not in direction_by_no:
            errors.append(f"Chapter {ch_no}: questions present but not in approved direction")

    return errors


def _validate_sort_order(rows: list[QuestionRow]) -> list[str]:
    errors: list[str] = []
    type_rank = {t: i for i, t in enumerate(QUESTION_TYPE_ORDER)}
    prev: tuple | None = None
    for row in rows:
        key = (row.chapter_no, type_rank.get(row.question_type, 99), row.question_id)
        if prev and key < prev:
            errors.append(
                f"Rows not sorted: {row.question_id} appears out of order "
                f"(chapter/type/id sort required)"
            )
            break
        prev = key
    return errors


def chapter_direction_map(direction: SubjectDirectionPlan) -> dict[int, ChapterDirection]:
    return {c.chapter_no: c for c in direction.chapters}
