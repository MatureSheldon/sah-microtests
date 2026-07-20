#!/usr/bin/env python3
"""Audit generated SAH workbook CSVs for pedagogy quality risks.

This is subject agnostic. It catches signals a human reviewer would immediately
dislike: repeated lesson phases, templated concept text, generic homework
answers, and repeated question explanations.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


PEDAGOGY_FIELDS = {
    "Lesson_Plans": [
        "objectives",
        "phase_engage",
        "phase_explore",
        "phase_explain",
        "phase_elaborate",
        "phase_evaluate",
        "notes",
    ],
    "Concepts": ["explanation", "misconceptions", "notes", "local_example"],
    "Homework": ["question_text", "answer", "explanation"],
    "Resources": ["description"],
    "Questions": ["Question", "Answer / Solution", "Explanation", "Learning Outcome"],
    "Worked_Examples": ["problem", "step_by_step_solution", "answer", "teacher_note"],
}

FILE_NAMES = {
    "Chapter_Map": "Chapter_Map.csv",
    "Lesson_Plans": "Lesson_Plans.csv",
    "Concepts": "Concepts.csv",
    "Homework": "Homework.csv",
    "Resources": "Resources.csv",
    "Questions": "Questions.csv",
    "Worked_Examples": "Worked_Examples.csv",
}

GENERIC_PATTERNS = [
    r"\bbegin with a quick question\b",
    r"\blet students skim the relevant textbook section\b",
    r"\bask for one evidence-backed oral answer\b",
    r"\bstudent responses should include a relevant text detail\b",
    r"\bthis homework encourages close reading\b",
    r"\breads the text closely, uses language in context\b",
    r"\bthis tests whether the student can move from recall to interpretation\b",
    r"\bthe item is suitable for a timed microtest\b",
    r"\bconnect the explanation with vocabulary, grammar\b",
]


@dataclass
class Finding:
    severity: str
    area: str
    location: str
    message: str


def cell(value: object) -> str:
    return "" if value is None else str(value).strip()


def words(value: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", value.lower())


def normalize(value: str, chapter_titles: list[str]) -> str:
    text = value.lower()
    for title in chapter_titles:
        if title:
            text = text.replace(title.lower(), "<chapter>")
    text = re.sub(r"\b(?:ch|chapter)?\s*\d+(?:\.\d+)?\b", "<num>", text)
    text = re.sub(r"\b[a-z]{2,}\d?[_-]ch\d{2}[_-]t\d{2}\b", "<id>", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def row_location(sheet: str, row: dict[str, str], index: int) -> str:
    for key in (
        "lesson_plan_id",
        "concept_id",
        "homework_id",
        "resource_id",
        "Question ID",
        "worked_example_id",
        "chapter_id",
    ):
        if row.get(key):
            return row[key]
    return f"{sheet}:row{index + 2}"


def repeated_field_findings(
    sheet: str,
    rows: list[dict[str, str]],
    field: str,
    chapter_titles: list[str],
    max_repeat: int,
) -> list[Finding]:
    values: list[tuple[str, str]] = []
    for idx, row in enumerate(rows):
        value = cell(row.get(field))
        if len(words(value)) < 6:
            continue
        values.append((normalize(value, chapter_titles), row_location(sheet, row, idx)))

    findings: list[Finding] = []
    counts = Counter(value for value, _loc in values)
    for value, count in counts.most_common():
        if count <= max_repeat:
            continue
        locations = [loc for v, loc in values if v == value][:8]
        findings.append(
            Finding(
                "warning",
                "repetition",
                f"{sheet}.{field}",
                f"Repeated or template-like text appears {count} times. Examples: {', '.join(locations)}",
            )
        )
    if len(rows) >= 10 and values:
        unique_ratio = len(set(v for v, _loc in values)) / len(values)
        if unique_ratio < 0.65:
            findings.append(
                Finding(
                    "warning",
                    "low-variety",
                    f"{sheet}.{field}",
                    f"Low uniqueness ratio {unique_ratio:.2f}; likely templated or insufficiently source-specific.",
                )
            )
    return findings


def generic_phrase_findings(sheet: str, rows: list[dict[str, str]], field: str) -> list[Finding]:
    findings: list[Finding] = []
    pattern_counts: dict[str, list[str]] = defaultdict(list)
    for idx, row in enumerate(rows):
        value = cell(row.get(field)).lower()
        for pattern in GENERIC_PATTERNS:
            if re.search(pattern, value):
                pattern_counts[pattern].append(row_location(sheet, row, idx))
    for pattern, locations in sorted(pattern_counts.items(), key=lambda item: (-len(item[1]), item[0])):
        if len(locations) >= 3:
            findings.append(
                Finding(
                    "warning",
                    "generic-phrasing",
                    f"{sheet}.{field}",
                    f"Generic phrase /{pattern}/ appears in {len(locations)} rows. Examples: {', '.join(locations[:8])}",
                )
            )
    return findings


def run(source_dir: Path, max_repeat: int) -> tuple[dict[str, int], list[Finding]]:
    data = {sheet: read_csv(source_dir / name) for sheet, name in FILE_NAMES.items()}
    chapter_titles = [cell(row.get("chapter_title")) for row in data["Chapter_Map"]]
    stats: dict[str, int] = {sheet: len(rows) for sheet, rows in data.items() if rows}
    findings: list[Finding] = []
    for sheet, fields in PEDAGOGY_FIELDS.items():
        rows = data.get(sheet, [])
        if not rows:
            continue
        for field in fields:
            if field not in rows[0]:
                continue
            findings.extend(repeated_field_findings(sheet, rows, field, chapter_titles, max_repeat))
            findings.extend(generic_phrase_findings(sheet, rows, field))
    return stats, findings


def render(source_dir: Path, stats: dict[str, int], findings: list[Finding]) -> str:
    status = "PASS" if not findings else "REVIEW"
    lines = [
        "# SAH Pedagogy Quality Audit",
        "",
        f"- Source folder: `{source_dir}`",
        f"- Status: **{status}**",
        f"- Findings: {len(findings)}",
        "",
        "## Row Counts",
        "",
    ]
    for sheet, count in stats.items():
        lines.append(f"- {sheet}: {count}")
    lines += ["", "## Findings By Area", ""]
    area_counts = Counter(f.area for f in findings)
    if area_counts:
        for area, count in area_counts.most_common():
            lines.append(f"- {area}: {count}")
    else:
        lines.append("- No findings.")
    lines += ["", "## Findings", ""]
    if findings:
        for finding in findings:
            lines.append(f"- **{finding.severity.upper()}** `{finding.area}` `{finding.location}`: {finding.message}")
    else:
        lines.append("No repetition or generic pedagogy patterns found by this audit.")
    lines += ["", "## Machine Stats", "", "```json", json.dumps({"rows": stats, "findings": len(findings)}, indent=2), "```", ""]
    return "\n".join(lines)


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit SAH workbook CSVs for repeated/template-like pedagogy.")
    parser.add_argument("--source-dir", type=Path, required=True, help="Folder containing subject workbook CSV files.")
    parser.add_argument("--report", type=Path, help="Output markdown report. Defaults to quality-audit-report.md in source-dir.")
    parser.add_argument("--max-repeat", type=int, default=2, help="Maximum allowed repeated normalized text per field.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when findings exist.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_dir = args.source_dir.expanduser().resolve()
    report_path = (args.report or source_dir / "quality-audit-report.md").expanduser().resolve()
    stats, findings = run(source_dir, args.max_repeat)
    report_path.write_text(render(source_dir, stats, findings), encoding="utf-8")
    print(report_path)
    print(f"findings={len(findings)}")
    if findings and args.strict:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
