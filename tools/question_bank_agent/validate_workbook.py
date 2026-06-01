#!/usr/bin/env python3
"""Validate a subject question-bank Excel workbook against SAH rules."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_AGENT_DIR = Path(__file__).resolve().parent
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

from schema import FORBIDDEN_EXTRA_SHEETS, QUESTIONS_SHEET_NAME, SAH_HEADERS

try:
    from openpyxl import load_workbook
except ImportError:
    print("Install dependencies: pip install -r tools/question_bank_agent/requirements.txt", file=sys.stderr)
    sys.exit(2)

MATHS_CASE_PARTS = ("(i)", "(ii)", "(iii)")
MATHS_CASE_MARKS = (1, 1, 2)


def cell_str(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def validate_workbook(path: Path) -> list[str]:
    errors: list[str] = []
    wb = load_workbook(path, read_only=True, data_only=True)

    for name in FORBIDDEN_EXTRA_SHEETS:
        if name in wb.sheetnames:
            errors.append(f"Forbidden sheet present: {name!r}")

    if QUESTIONS_SHEET_NAME not in wb.sheetnames:
        errors.append(f"Missing required sheet: {QUESTIONS_SHEET_NAME!r}")
        wb.close()
        return errors

    ws = wb[QUESTIONS_SHEET_NAME]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        errors.append("Questions sheet is empty")
        wb.close()
        return errors

    headers = [cell_str(h) for h in rows[0]]
    if headers != SAH_HEADERS:
        if len(headers) != len(SAH_HEADERS):
            errors.append(f"Header count {len(headers)} != expected {len(SAH_HEADERS)}")
        for i, (got, want) in enumerate(zip(headers, SAH_HEADERS)):
            if got != want:
                errors.append(f"Header column {i + 1}: got {got!r}, want {want!r}")
                break
        else:
            extra = headers[len(SAH_HEADERS) :]
            if extra:
                errors.append(f"Extra header columns: {extra}")

    col = {h: i for i, h in enumerate(headers) if h}
    seen_ids: set[str] = set()
    chapter_nums: list[float] = []
    prev_chapter: float | None = None

    for row_idx, row in enumerate(rows[1:], start=2):
        if not any(cell_str(c) for c in row):
            continue

        def get(header: str) -> str:
            idx = col.get(header)
            if idx is None:
                return ""
            return cell_str(row[idx]) if idx < len(row) else ""

        qid = get("Question ID")
        if not qid:
            errors.append(f"Row {row_idx}: missing Question ID")
            continue
        if qid in seen_ids:
            errors.append(f"Row {row_idx}: duplicate Question ID {qid!r}")
        seen_ids.add(qid)

        use = get("Use in Papers")
        if use and use != "Yes":
            errors.append(f"Row {row_idx} ({qid}): Use in Papers must be Yes, got {use!r}")

        ch_raw = get("Chapter No.")
        try:
            ch_num = float(ch_raw) if ch_raw else float("nan")
        except ValueError:
            errors.append(f"Row {row_idx} ({qid}): invalid Chapter No. {ch_raw!r}")
            ch_num = float("nan")

        if ch_raw:
            chapter_nums.append(ch_num)
            if prev_chapter is not None and ch_num < prev_chapter:
                errors.append(
                    f"Row {row_idx} ({qid}): rows not sorted by Chapter No. "
                    f"({ch_num} after {prev_chapter})"
                )
            prev_chapter = ch_num

        qtype = get("Question Type")
        subject = get("Subject")
        marks_raw = get("Marks")
        question_text = get("Question")

        if qtype == "MCQ":
            for opt in ("Option A", "Option B", "Option C", "Option D"):
                if not get(opt):
                    errors.append(f"Row {row_idx} ({qid}): MCQ missing {opt}")
            if not get("Correct Answer"):
                errors.append(f"Row {row_idx} ({qid}): MCQ missing Correct Answer")

        if subject == "Maths" and qtype == "Case/Source-Based":
            for part in MATHS_CASE_PARTS:
                if part not in question_text:
                    errors.append(f"Row {row_idx} ({qid}): Maths case missing sub-part {part}")
            try:
                marks = int(float(marks_raw)) if marks_raw else 0
            except ValueError:
                marks = -1
            if marks != sum(MATHS_CASE_MARKS):
                errors.append(
                    f"Row {row_idx} ({qid}): Maths case marks must be 4 (1+1+2), got {marks_raw!r}"
                )

        asset_fmt = get("Asset Format")
        asset_data = get("Asset Data")
        image_url = get("Image URL")
        if asset_fmt and not asset_data and not image_url:
            errors.append(f"Row {row_idx} ({qid}): Asset Format set but Asset Data and Image URL empty")

    wb.close()
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SAH question-bank Excel workbook")
    parser.add_argument("workbook", type=Path, help="Path to .xlsx file")
    args = parser.parse_args()

    if not args.workbook.is_file():
        print(f"File not found: {args.workbook}", file=sys.stderr)
        return 1

    errors = validate_workbook(args.workbook)
    if errors:
        print(f"FAIL: {args.workbook}")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"OK: {args.workbook}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
