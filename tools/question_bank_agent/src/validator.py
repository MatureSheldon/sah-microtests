"""Validate SAH question batches against direction plans and schema rules."""

from __future__ import annotations

import re
import sys
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


def get_set_id_from_notes(notes: str) -> str:
    if not notes:
        return ""
    match = re.search(r"Set\s*ID\s*:\s*([^\s\n\r]+)", notes, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""


def extract_passage_and_sub_question(question_text: str) -> tuple[str, str]:
    text = question_text.strip()
    lower_text = text.lower()
    is_passage_or_extract = (
        lower_text.startswith("passage:") or 
        lower_text.startswith("extract:") or
        lower_text.startswith("read the extract") or
        lower_text.startswith("read the passage") or
        lower_text.startswith("passage ") or
        lower_text.startswith("extract ")
    )
    if is_passage_or_extract:
        parts = text.split("\n\n")
        if len(parts) >= 2:
            passage = parts[0].strip()
            sub_q = "\n\n".join(parts[1:]).strip()
            return passage, sub_q
    return "", text


def normalize_passage(passage: str) -> str:
    return re.sub(r"\s+", " ", passage.strip().lower())


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
    seen_sub_questions_by_set: dict[str, set[str]] = defaultdict(set)
    set_id_to_passages: dict[str, list[tuple[str, str]]] = defaultdict(list)
    by_chapter: dict[int, list[QuestionRow]] = defaultdict(list)

    for row in rows:
        by_chapter[row.chapter_no].append(row)

        if row.question_id in seen_ids:
            errors.append(f"Duplicate Question ID: {row.question_id!r}")
        seen_ids.add(row.question_id)

        notes_str = row.notes or ""
        set_id = get_set_id_from_notes(notes_str)
        passage, sub_q = extract_passage_and_sub_question(row.question)

        if set_id:
            set_id_to_passages[set_id].append((row.question_id, passage or row.question))
            sub_q_key = normalize_stem(sub_q)
            if sub_q_key in seen_sub_questions_by_set[set_id]:
                errors.append(
                    f"Duplicate question prompt {row.question_id!r} within the same Set {set_id!r}"
                )
            seen_sub_questions_by_set[set_id].add(sub_q_key)
        else:
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

    # Check consistency of passage/extract for the same Set ID (warning, not hard failure)
    for set_id, items in set_id_to_passages.items():
        if len(items) > 1:
            first_row_id, first_passage = items[0]
            first_norm = normalize_passage(first_passage)
            for row_id, passage in items[1:]:
                if normalize_passage(passage) != first_norm:
                    print(
                        f"WARNING: Consistency error for Set {set_id!r}: passage text in {row_id!r} "
                        f"does not match passage text in {first_row_id!r}",
                        file=sys.stderr
                    )

    # Warning check: group English rows by their passage/extract text prefix
    passage_groups: dict[str, list[QuestionRow]] = defaultdict(list)
    for row in rows:
        if row.subject.strip().lower() == "english":
            passage, _ = extract_passage_and_sub_question(row.question)
            if passage:
                key = normalize_passage(passage)
                passage_groups[key].append(row)

    for key, group_rows in passage_groups.items():
        if len(group_rows) > 6:
            no_set_id_rows = []
            for r in group_rows:
                if not get_set_id_from_notes(r.notes):
                    no_set_id_rows.append(r.question_id)
            if len(no_set_id_rows) > 6:
                print(
                    f"WARNING: More than 6 reading comprehension/extract rows share the same passage "
                    f"but do not have a Set ID in Notes: {', '.join(no_set_id_rows)}",
                    file=sys.stderr
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
