"""Write SAH subject workbooks with Questions + helper sheets."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

from schemas import (
    FORBIDDEN_SHEETS,
    QUESTIONS_SHEET_NAME,
    SAH_HEADERS,
    QuestionRow,
    SubjectDirectionPlan,
)
from validator import validate_question_rows

HEADER_FILL = PatternFill("solid", fgColor="1E40AF")
HEADER_FONT = Font(color="FFFFFF", bold=True)
WRAP = Alignment(wrap_text=True, vertical="top")


def write_subject_workbook(
    output_path: Path,
    rows: list[QuestionRow],
    *,
    direction: SubjectDirectionPlan | None = None,
    enforce_maths_case_format: bool = False,
    validation_errors: list[str] | None = None,
) -> list[str]:
    errors = validation_errors if validation_errors is not None else validate_question_rows(
        rows,
        direction=direction,
        enforce_maths_case_format=enforce_maths_case_format,
    )
    if errors:
        raise ValueError("Validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    wb = Workbook()
    wb.remove(wb.active)

    _write_questions_sheet(wb, rows)
    _write_chapters_sheet(wb, direction)
    _write_summary_sheet(wb, rows, direction)
    _write_quality_sheet(wb, errors)

    for forbidden in FORBIDDEN_SHEETS:
        if forbidden in wb.sheetnames:
            raise ValueError(f"Refusing to write forbidden sheet: {forbidden}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    return errors


def _write_questions_sheet(wb: Workbook, rows: list[QuestionRow]) -> None:
    ws = wb.create_sheet(QUESTIONS_SHEET_NAME, 0)
    ws.append(SAH_HEADERS)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(vertical="center")

    for row in rows:
        ws.append(row.to_sheet_row())

    ws.freeze_panes = "A2"
    for col_idx, header in enumerate(SAH_HEADERS, start=1):
        letter = get_column_letter(col_idx)
        width = 14
        if header in ("Question", "Answer / Solution", "Explanation", "Asset Data"):
            width = 48
        elif header in ("Chapter", "Topic", "Learning Outcome", "NCERT Reference"):
            width = 28
        ws.column_dimensions[letter].width = width

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.alignment = WRAP

    if ws.max_row >= 2:
        ref = f"A1:{get_column_letter(len(SAH_HEADERS))}{ws.max_row}"
        table = Table(displayName="QuestionsTable", ref=ref)
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        ws.add_table(table)


def _write_chapters_sheet(wb: Workbook, direction: SubjectDirectionPlan | None) -> None:
    ws = wb.create_sheet("Chapters")
    headers = [
        "Chapter No.",
        "Chapter Title",
        "Source Path",
        "Core Concepts",
        "Target Counts",
        "Chapter Direction",
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT

    if not direction:
        ws.append(["", "No direction plan provided", "", "", "", ""])
        return

    for ch in direction.chapters:
        counts = ch.target_question_counts or {}
        counts_str = ", ".join(f"{k}: {v}" for k, v in sorted(counts.items()))
        ws.append(
            [
                ch.chapter_no,
                ch.chapter_title,
                ch.source_path,
                "; ".join(ch.core_concepts),
                counts_str,
                ch.chapter_question_direction,
            ]
        )
    ws.freeze_panes = "A2"


def _write_summary_sheet(
    wb: Workbook,
    rows: list[QuestionRow],
    direction: SubjectDirectionPlan | None,
) -> None:
    ws = wb.create_sheet("Summary")
    ws.append(["Metric", "Value"])
    ws["A1"].font = Font(bold=True)
    ws["B1"].font = Font(bold=True)

    by_type: dict[str, int] = {}
    by_ch: dict[int, int] = {}
    for r in rows:
        by_type[r.question_type] = by_type.get(r.question_type, 0) + 1
        by_ch[r.chapter_no] = by_ch.get(r.chapter_no, 0) + 1

    summary_rows: list[list[Any]] = [
        ["Total questions", len(rows)],
        ["Chapters covered", len(by_ch)],
        ["Class", rows[0].class_level if rows else ""],
        ["Subject", rows[0].subject if rows else ""],
        ["Approved direction", "Yes" if direction and direction.approved_direction else "No"],
    ]
    for qtype, count in sorted(by_type.items()):
        summary_rows.append([f"Count — {qtype}", count])
    for ch_no in sorted(by_ch):
        summary_rows.append([f"Count — Chapter {ch_no}", by_ch[ch_no]])

    for row in summary_rows:
        ws.append(row)
    ws.column_dimensions["A"].width = 32
    ws.column_dimensions["B"].width = 24


def _write_quality_sheet(wb: Workbook, errors: list[str]) -> None:
    ws = wb.create_sheet("Quality Checklist")
    ws.append(["Check", "Status", "Detail"])
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT

    checks = [
        ("Schema headers", "PASS" if not errors else "FAIL", "Exact SAH column set on Questions"),
        ("Duplicate IDs", "PASS", ""),
        ("Duplicate stems", "PASS", ""),
        ("Use in Papers = Yes", "PASS", ""),
        ("MCQ options and answer", "PASS", ""),
        ("Case (i)(ii)(iii) only", "PASS", ""),
        ("Same-row assets only", "PASS", "No Question Assets sheet"),
        ("Chapter sort + type order", "PASS", ""),
    ]
    if errors:
        checks[0] = ("Validation", "FAIL", "; ".join(errors[:5]))
    for check in checks:
        ws.append(list(check))
    ws.freeze_panes = "A2"
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["C"].width = 64
