#!/usr/bin/env python3
"""Sort SAH subject workbook CSV rows into stable chapter/topic/question order."""

from __future__ import annotations

import argparse
import csv
import shutil
from datetime import datetime
from pathlib import Path
from typing import Iterable

from validate_subject_workbook import ALL_FILES


def cell(value: object) -> str:
    return "" if value is None else str(value).strip()


def natural_int(value: str, default: int = 10**9) -> int:
    try:
        return int(float(cell(value)))
    except ValueError:
        digits = "".join(ch if ch.isdigit() else " " for ch in cell(value)).split()
        return int(digits[0]) if digits else default


def read_rows(path: Path, headers: list[str]) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != headers:
            raise SystemExit(f"Header mismatch in {path}. Refusing to sort.")
        return list(reader)


def write_rows(path: Path, headers: list[str], rows: list[dict[str, str]], backup: bool) -> None:
    if backup and path.exists():
        suffix = ".bak-sort-" + datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(path, path.with_suffix(path.suffix + suffix))
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def chapter_order(chapter_id: str, chapter_no_by_id: dict[str, int]) -> int:
    cid = cell(chapter_id)
    if cid in chapter_no_by_id:
        return chapter_no_by_id[cid]
    return natural_int(cid)


def sort_key_factory(data: dict[str, list[dict[str, str]]]):
    chapter_no_by_id = {
        cell(row.get("chapter_id")): natural_int(row.get("chapter_no", ""))
        for row in data.get("Chapter_Map", [])
    }
    topic_order_by_id = {
        cell(row.get("topic_id")): (
            chapter_order(row.get("chapter_id", ""), chapter_no_by_id),
            natural_int(row.get("sequence_no", "")),
            cell(row.get("topic_id")),
        )
        for row in data.get("Topic_Map", [])
    }
    topic_order_by_chapter_title = {
        (str(chapter_no_by_id.get(cell(row.get("chapter_id")), 10**9)), cell(row.get("topic_title")).lower()): order
        for row_id, order in topic_order_by_id.items()
        for row in data.get("Topic_Map", [])
        if cell(row.get("topic_id")) == row_id
    }

    def topic_key(row: dict[str, str]) -> tuple[object, ...]:
        tid = cell(row.get("topic_id"))
        if tid in topic_order_by_id:
            return topic_order_by_id[tid]
        return (chapter_order(row.get("chapter_id", ""), chapter_no_by_id), 10**9, tid)

    def key(sheet: str, row: dict[str, str]) -> tuple[object, ...]:
        if sheet == "Chapter_Map":
            return (natural_int(row.get("chapter_no", "")), cell(row.get("chapter_id")))
        if sheet == "Topic_Map":
            return topic_key(row)
        if sheet == "Homework":
            return (*topic_key(row), natural_int(row.get("sequence_no", "")), cell(row.get("homework_id")))
        if sheet == "Questions":
            ch_no = natural_int(row.get("Chapter No.", ""))
            topic_order = topic_order_by_chapter_title.get((str(ch_no), cell(row.get("Topic")).lower()), (ch_no, 10**9, ""))
            return (ch_no, topic_order[1], cell(row.get("Question ID")))
        if sheet == "Teacher_Review":
            return (
                chapter_order(row.get("chapter_id", ""), chapter_no_by_id),
                topic_order_by_id.get(cell(row.get("topic_id")), (10**9, 10**9, ""))[1],
                cell(row.get("review_id")),
            )
        return (*topic_key(row), cell(next((col for col in row if col.endswith("_id") or col == "Question ID"), "")))

    return key


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sort SAH subject workbook CSV files in stable chapter/topic order.")
    parser.add_argument("--source-dir", type=Path, required=True, help="Folder containing subject workbook CSVs.")
    parser.add_argument("--check", action="store_true", help="Only report files that would change.")
    parser.add_argument("--no-backup", action="store_true", help="Do not create .bak-sort timestamp backups when writing.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_dir = args.source_dir.expanduser().resolve()
    data: dict[str, list[dict[str, str]]] = {}
    headers_by_sheet: dict[str, list[str]] = {}
    for sheet, (filename, headers) in ALL_FILES.items():
        path = source_dir / filename
        if path.exists():
            data[sheet] = read_rows(path, headers)
            headers_by_sheet[sheet] = headers

    key_for = sort_key_factory(data)
    changed: list[str] = []
    for sheet, rows in data.items():
        sorted_rows = sorted(rows, key=lambda row, sheet=sheet: key_for(sheet, row))
        if sorted_rows != rows:
            changed.append(ALL_FILES[sheet][0])
            if not args.check:
                write_rows(source_dir / ALL_FILES[sheet][0], headers_by_sheet[sheet], sorted_rows, backup=not args.no_backup)

    if args.check:
        if changed:
            print("Would sort:")
            for filename in changed:
                print(f"- {filename}")
            return 1
        print("CSV row order already stable.")
        return 0

    print(f"Sorted CSV files: {len(changed)}")
    for filename in changed:
        print(f"- {filename}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
