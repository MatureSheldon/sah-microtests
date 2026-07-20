#!/usr/bin/env python3
"""Append one generated chapter draft JSON into the subject workbook CSVs."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from validate_subject_workbook import ALL_FILES, REQUIRED_FILES


ID_COLUMNS = {
    "Chapter_Map": "chapter_id",
    "Topic_Map": "topic_id",
    "Lesson_Plans": "lesson_plan_id",
    "Concepts": "concept_id",
    "Homework": "homework_id",
    "Resources": "resource_id",
    "Questions": "Question ID",
    "Worked_Examples": "worked_example_id",
    "Teacher_Review": "review_id",
}


def load_json(path: Path) -> dict[str, object]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"Draft JSON is invalid: {path}: {error}") from error


def read_existing(path: Path, headers: list[str]) -> tuple[list[dict[str, str]], set[str]]:
    if not path.exists():
        return [], set()
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != headers:
            raise SystemExit(f"Header mismatch in {path}. Refusing to append.")
        rows = list(reader)
    return rows, {json.dumps(row, sort_keys=True, ensure_ascii=False) for row in rows}


def normalize_row(sheet: str, row: object, headers: list[str]) -> dict[str, str]:
    if not isinstance(row, dict):
        raise SystemExit(f"{sheet} row must be a JSON object.")
    unknown = sorted(set(row) - set(headers))
    if unknown:
        raise SystemExit(f"{sheet} row has unknown columns: {', '.join(unknown)}")
    return {header: "" if row.get(header) is None else str(row.get(header, "")) for header in headers}


def backup_file(path: Path) -> Path | None:
    if not path.exists():
        return None
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = path.with_suffix(path.suffix + f".bak-{timestamp}")
    shutil.copy2(path, backup)
    return backup


def write_csv(path: Path, headers: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def draft_rows_for_sheet(draft: dict[str, object], sheet: str) -> list[object]:
    value = draft.get(sheet, [])
    if value is None:
        return []
    if not isinstance(value, list):
        raise SystemExit(f"Draft field {sheet} must be an array.")
    return value


def apply_draft(subject_workbook_dir: Path, draft_path: Path, replace_chapter_id: str | None, dry_run: bool) -> dict[str, object]:
    draft = load_json(draft_path)
    summary: dict[str, object] = {
        "draft": str(draft_path),
        "subject_workbook_dir": str(subject_workbook_dir),
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": dry_run,
        "sheets": {},
        "backups": [],
    }

    replace_chapter_no = ""
    if replace_chapter_id:
        chapter_rows = draft_rows_for_sheet(draft, "Chapter_Map")
        if chapter_rows:
            chapter_ids = {
                str(row.get("chapter_id", "")).strip()
                for row in chapter_rows
                if isinstance(row, dict)
            }
            if chapter_ids and chapter_ids != {replace_chapter_id}:
                raise SystemExit(
                    "--replace-chapter-id must match the draft Chapter_Map chapter_id. "
                    f"Got draft ids: {sorted(chapter_ids)}"
                )
            for row in chapter_rows:
                if isinstance(row, dict):
                    replace_chapter_no = str(row.get("chapter_no", "")).strip()
                    break

    pending_writes: list[tuple[Path, list[str], list[dict[str, str]]]] = []

    for sheet, (file_name, headers) in ALL_FILES.items():
        path = subject_workbook_dir / file_name
        if sheet not in REQUIRED_FILES and not path.exists() and not draft_rows_for_sheet(draft, sheet):
            continue
        existing, existing_signatures = read_existing(path, headers)
        incoming_raw = draft_rows_for_sheet(draft, sheet)
        incoming = [normalize_row(sheet, row, headers) for row in incoming_raw]
        id_col = ID_COLUMNS[sheet]

        if replace_chapter_id:
            existing = [
                row
                for row in existing
                if str(row.get("chapter_id", "")).strip() != replace_chapter_id
                and not (
                    sheet == "Questions"
                    and replace_chapter_no
                    and str(row.get("Chapter No.", "")).strip() == replace_chapter_no
                )
            ]
            existing_signatures = {json.dumps(row, sort_keys=True, ensure_ascii=False) for row in existing}

        existing_ids = {row.get(id_col, "") for row in existing if row.get(id_col, "")}
        incoming_ids = [row.get(id_col, "") for row in incoming]
        duplicate_incoming = sorted({value for value in incoming_ids if value and incoming_ids.count(value) > 1})
        duplicate_existing = sorted(value for value in incoming_ids if value and value in existing_ids)
        if duplicate_incoming:
            raise SystemExit(f"{sheet} has duplicate IDs inside draft: {', '.join(duplicate_incoming[:20])}")
        if duplicate_existing:
            raise SystemExit(f"{sheet} draft IDs already exist: {', '.join(duplicate_existing[:20])}")

        appended = []
        skipped_exact = 0
        for row in incoming:
            signature = json.dumps(row, sort_keys=True, ensure_ascii=False)
            if signature in existing_signatures:
                skipped_exact += 1
                continue
            appended.append(row)

        output_rows = existing + appended
        pending_writes.append((path, headers, output_rows))
        summary["sheets"][sheet] = {
            "incoming": len(incoming),
            "appended": len(appended),
            "skipped_exact_duplicates": skipped_exact,
            "final_rows": len(output_rows),
        }

    if not dry_run:
        for path, headers, rows in pending_writes:
            backup = backup_file(path)
            if backup:
                summary["backups"].append(str(backup))
            write_csv(path, headers, rows)
        log_path = subject_workbook_dir / "draft-apply-log.jsonl"
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(summary, ensure_ascii=False) + "\n")
        summary["log"] = str(log_path)

    return summary


def write_template(path: Path) -> None:
    template = {
        "metadata": {
            "class": "",
            "subject": "",
            "chapter_no": "",
            "chapter_title": "",
            "source_file": "",
            "generated_by": "AI draft",
        }
    }
    for sheet in ALL_FILES:
        template[sheet] = []
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(template, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Apply one generated chapter JSON draft into subject workbook CSVs.")
    parser.add_argument("--subject-workbook-dir", type=Path, required=True, help="Folder containing the seven subject workbook CSVs.")
    parser.add_argument("--draft", type=Path, help="Generated chapter draft JSON.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without writing CSVs.")
    parser.add_argument(
        "--replace-chapter-id",
        help="Remove existing rows for this chapter_id before appending draft rows. Useful for regenerating one chapter.",
    )
    parser.add_argument("--write-template", type=Path, help="Write an empty draft JSON template and exit.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.write_template:
        write_template(args.write_template.expanduser().resolve())
        print(args.write_template.expanduser().resolve())
        return 0

    if not args.draft:
        raise SystemExit("--draft is required unless --write-template is used.")

    summary = apply_draft(
        args.subject_workbook_dir.expanduser().resolve(),
        args.draft.expanduser().resolve(),
        args.replace_chapter_id,
        args.dry_run,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
