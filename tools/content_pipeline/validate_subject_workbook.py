#!/usr/bin/env python3
"""Run SAH content-quality validators against a subject workbook CSV folder.

This validator is class/subject agnostic. It expects the seven app-facing CSVs:

- Chapter_Map.csv
- Topic_Map.csv
- Lesson_Plans.csv
- Concepts.csv
- Homework.csv
- Resources.csv
- Questions.csv

It produces a markdown review report with six passes:

1. Schema and relationship validation
2. Concept quality validation
3. Misconception validation
4. Visual asset validation
5. Homework quality validation
6. Question bank validation
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


CHAPTER_MAP_HEADERS = ["chapter_id", "chapter_no", "chapter_title", "default_priority", "status"]
TOPIC_MAP_HEADERS = ["topic_id", "chapter_id", "sequence_no", "topic_title", "relative_weight", "relative_difficulty", "learning_outcomes", "status"]
LESSON_PLANS_HEADERS = ["lesson_plan_id", "chapter_id", "topic_id", "objectives", "phase_engage", "phase_explore", "phase_explain", "phase_elaborate", "phase_evaluate", "required_resources", "notes"]
CONCEPTS_HEADERS = ["concept_id", "chapter_id", "topic_id", "concept_title", "explanation", "key_formulas", "misconceptions", "visual_type", "visual_data", "notes"]
HOMEWORK_HEADERS = [
    "homework_id", "chapter_id", "topic_id", "set_title", "sequence_no",
    "question_text", "marks", "difficulty", "answer", "explanation", "status",
    "asset_format", "asset_data", "asset_placement", "asset_width", "asset_height",
]
RESOURCES_HEADERS = ["resource_id", "chapter_id", "topic_id", "resource_type", "title", "url", "description", "status"]
QUESTIONS_HEADERS = [
    "Question ID", "Class", "Subject", "Chapter No.", "Chapter", "Topic", "Subtopic",
    "Difficulty", "Question Type", "Question Style", "Marks", "Question", "Option A",
    "Option B", "Option C", "Option D", "Correct Answer", "Answer / Solution",
    "Explanation", "Learning Outcome", "NCERT Reference", "Source Type", "PYQ Year",
    "PYQ Board/Exam", "PYQ Paper/Set", "Use in Papers", "Times Asked",
    "Last Asked Date", "Last Paper ID", "Last Updated", "Notes", "Image URL",
    "Asset Format", "Asset Data", "Asset Placement", "Asset Width", "Asset Height",
]

REQUIRED_FILES = {
    "Chapter_Map": ("Chapter_Map.csv", CHAPTER_MAP_HEADERS),
    "Topic_Map": ("Topic_Map.csv", TOPIC_MAP_HEADERS),
    "Lesson_Plans": ("Lesson_Plans.csv", LESSON_PLANS_HEADERS),
    "Concepts": ("Concepts.csv", CONCEPTS_HEADERS),
    "Homework": ("Homework.csv", HOMEWORK_HEADERS),
    "Resources": ("Resources.csv", RESOURCES_HEADERS),
    "Questions": ("Questions.csv", QUESTIONS_HEADERS),
}

MERMAID_STARTS = (
    "flowchart", "graph", "sequenceDiagram", "stateDiagram", "classDiagram",
    "erDiagram", "gantt", "journey", "gitGraph", "mindmap", "timeline", "pie",
)

SPATIAL_KEYWORDS = {
    "sun", "earth", "moon", "planet", "orbit", "phase", "eclipse", "mirror",
    "lens", "ray", "reflection", "force", "pressure", "circuit", "current",
    "electromagnet", "particle", "solid", "liquid", "gas", "density", "float",
    "sink", "volume", "number line", "coordinate", "graph", "angle", "triangle",
    "circle", "area", "perimeter", "construction", "map", "grid",
}

FLOW_KEYWORDS = {
    "cycle", "process", "cause", "effect", "chain", "classification", "relationship",
    "web", "timeline", "sequence", "steps", "flow", "transmission",
}

EXPLORATORY_VERBS = {
    "observe", "draw", "label", "compare", "classify", "explain", "justify",
    "measure", "model", "investigate", "interview", "survey", "design",
    "reflect", "record", "make", "create", "prepare", "solve", "predict",
}

GENERIC_CONCEPT_PHRASES = {
    "this concept is important", "students will learn", "in this topic",
    "this section covers", "introduction to", "advanced applications",
}


@dataclass
class Finding:
    severity: str
    validator: str
    location: str
    message: str


@dataclass
class Report:
    source_dir: Path
    findings: list[Finding] = field(default_factory=list)
    stats: dict[str, object] = field(default_factory=dict)

    def add(self, severity: str, validator: str, location: str, message: str) -> None:
        self.findings.append(Finding(severity, validator, location, message))

    @property
    def errors(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "error"]

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "warning"]


def cell(value: object) -> str:
    return "" if value is None else str(value).strip()


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]], list[list[str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        raw_rows = list(csv.reader(handle))
    if not raw_rows:
        return [], [], []
    header = raw_rows[0]
    records = [dict(zip(header, row)) for row in raw_rows[1:] if any(cell(c) for c in row)]
    return header, records, raw_rows


def split_points(value: str) -> list[str]:
    text = cell(value)
    if not text:
        return []
    line_parts = [
        re.sub(r"^\s*[-*•]\s*", "", part).strip()
        for part in re.split(r"\r?\n+", text)
        if part.strip()
    ]
    if len(line_parts) > 1:
        return line_parts
    return [part.strip() for part in text.split(";") if part.strip()]


def starts_like_svg(value: str) -> bool:
    text = cell(value)
    decoded = html.unescape(text)
    return decoded.startswith("<svg") and decoded.endswith("</svg>")


def starts_like_mermaid(value: str) -> bool:
    text = cell(value)
    return any(text.startswith(prefix) for prefix in MERMAID_STARTS)


def parse_int(value: str, default: int = 0) -> int:
    try:
        return int(float(cell(value)))
    except ValueError:
        return default


def load_subject(source_dir: Path, report: Report) -> dict[str, list[dict[str, str]]]:
    data: dict[str, list[dict[str, str]]] = {}
    for sheet, (filename, expected_header) in REQUIRED_FILES.items():
        path = source_dir / filename
        if not path.exists():
            report.add("error", "schema", filename, "Required CSV is missing.")
            data[sheet] = []
            continue
        header, rows, raw_rows = read_csv(path)
        data[sheet] = rows
        if header != expected_header:
            report.add(
                "error",
                "schema",
                filename,
                f"Header mismatch. Got {len(header)} columns; expected {len(expected_header)}.",
            )
            for idx, (got, want) in enumerate(zip(header, expected_header), start=1):
                if got != want:
                    report.add("error", "schema", f"{filename}:col{idx}", f"Got {got!r}; expected {want!r}.")
                    break
        bad_rows = [i + 1 for i, row in enumerate(raw_rows[1:], start=1) if len(row) != len(header)]
        if bad_rows:
            report.add("error", "schema", filename, f"Rows with wrong column count: {bad_rows[:20]}.")
    return data


def validate_schema(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    chapter_ids = [r.get("chapter_id", "") for r in data["Chapter_Map"]]
    topic_ids = [r.get("topic_id", "") for r in data["Topic_Map"]]
    chapter_set = set(chapter_ids)
    topic_set = set(topic_ids)
    chapters_by_no = {cell(r.get("chapter_no")): r for r in data["Chapter_Map"] if cell(r.get("chapter_no"))}
    topic_titles_by_chapter_no = defaultdict(set)
    chapter_no_by_id = {cell(r.get("chapter_id")): cell(r.get("chapter_no")) for r in data["Chapter_Map"]}
    for topic in data["Topic_Map"]:
        ch_no = chapter_no_by_id.get(cell(topic.get("chapter_id")), "")
        topic_title = cell(topic.get("topic_title"))
        if ch_no and topic_title:
            topic_titles_by_chapter_no[ch_no].add(topic_title.lower())

    for name, values, key in [
        ("Chapter_Map", chapter_ids, "chapter_id"),
        ("Topic_Map", topic_ids, "topic_id"),
        ("Lesson_Plans", [r.get("lesson_plan_id", "") for r in data["Lesson_Plans"]], "lesson_plan_id"),
        ("Concepts", [r.get("concept_id", "") for r in data["Concepts"]], "concept_id"),
        ("Homework", [r.get("homework_id", "") for r in data["Homework"]], "homework_id"),
        ("Resources", [r.get("resource_id", "") for r in data["Resources"]], "resource_id"),
        ("Questions", [r.get("Question ID", "") for r in data["Questions"]], "Question ID"),
    ]:
        counts = Counter(values)
        for value, count in counts.items():
            if not value:
                report.add("error", "schema", name, f"Missing {key}.")
            elif count > 1:
                report.add("error", "schema", name, f"Duplicate {key}: {value!r}.")

    for sheet in ("Topic_Map", "Lesson_Plans", "Concepts", "Homework", "Resources"):
        for idx, row in enumerate(data[sheet], start=2):
            cid = row.get("chapter_id", "")
            tid = row.get("topic_id", "")
            if not cell(cid):
                report.add("error", "schema", f"{sheet}:row{idx}", "chapter_id is required.")
            elif cid not in chapter_set:
                report.add("error", "schema", f"{sheet}:row{idx}", f"chapter_id {cid!r} not found in Chapter_Map.")
            if sheet != "Topic_Map" and not cell(tid):
                report.add("error", "schema", f"{sheet}:row{idx}", "topic_id is required.")
            elif sheet != "Topic_Map" and tid not in topic_set:
                report.add("error", "schema", f"{sheet}:row{idx}", f"topic_id {tid!r} not found in Topic_Map.")

    for idx, row in enumerate(data["Questions"], start=2):
        ch_no = cell(row.get("Chapter No."))
        topic = cell(row.get("Topic"))
        if not ch_no:
            report.add("error", "schema", f"Questions:row{idx}", "Chapter No. is required.")
        elif ch_no not in chapters_by_no:
            report.add("error", "schema", f"Questions:row{idx}", f"Chapter No. {ch_no!r} not found in Chapter_Map.")
        if not topic:
            report.add("warning", "schema", f"Questions:row{idx}", "Topic is blank.")
        elif ch_no in topic_titles_by_chapter_no and topic.lower() not in topic_titles_by_chapter_no[ch_no]:
            report.add("warning", "schema", f"Questions:row{idx}", f"Topic {topic!r} does not match Topic_Map for Chapter No. {ch_no}.")
        if cell(row.get("Use in Papers")).lower() not in {"yes", "y", "true", "1"}:
            report.add("warning", "schema", f"Questions:row{idx}", "Use in Papers should be Yes for usable question-bank rows.")

    report.stats["rows"] = {sheet: len(rows) for sheet, rows in data.items()}


def validate_concepts(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    concepts_by_chapter = defaultdict(list)
    topics_by_chapter = defaultdict(list)
    for topic in data["Topic_Map"]:
        topics_by_chapter[topic.get("chapter_id", "")].append(topic)
    for concept in data["Concepts"]:
        concepts_by_chapter[concept.get("chapter_id", "")].append(concept)

    for chapter in data["Chapter_Map"]:
        cid = chapter.get("chapter_id", "")
        concepts = concepts_by_chapter[cid]
        topics = topics_by_chapter[cid]
        if topics and len(concepts) < max(4, min(len(topics), 6)):
            report.add("warning", "concept-quality", cid, f"Only {len(concepts)} concepts for {len(topics)} topics.")

    for row in data["Concepts"]:
        cid = row.get("concept_id", "")
        title = cell(row.get("concept_title"))
        explanation = cell(row.get("explanation"))
        if len(title) < 8:
            report.add("warning", "concept-quality", cid, "Concept title is very short.")
        if len(explanation.split()) < 25:
            report.add("warning", "concept-quality", cid, "Concept explanation is too thin for teacher use.")
        lower = explanation.lower()
        if any(phrase in lower for phrase in GENERIC_CONCEPT_PHRASES):
            report.add("warning", "concept-quality", cid, "Explanation contains generic placeholder-like phrasing.")


def validate_misconceptions(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    fragment_starts = {"the ", "and ", "or ", "but ", "because ", "while ", "which "}
    bad_fragments = {"the mechanisms differ", "confusing terms", "incorrect order of operations"}
    for row in data["Concepts"]:
        cid = row.get("concept_id", "")
        raw = cell(row.get("misconceptions"))
        if not raw:
            report.add("warning", "misconceptions", cid, "No misconceptions recorded.")
            continue
        if ";" in raw and "\n" not in raw:
            report.add("warning", "misconceptions", cid, "Uses semicolon-separated misconceptions; prefer newline-separated complete points.")
        for point in split_points(raw):
            lower = point.lower().strip(". ")
            if lower in bad_fragments or len(point.split()) < 5:
                report.add("warning", "misconceptions", cid, f"Fragmentary misconception: {point!r}.")
            if any(lower.startswith(prefix) for prefix in fragment_starts):
                report.add("warning", "misconceptions", cid, f"Misconception may be a sentence fragment: {point!r}.")


def expected_visual_format(text: str) -> str | None:
    lower = text.lower()
    if any(keyword in lower for keyword in SPATIAL_KEYWORDS):
        return "svg"
    if any(keyword in lower for keyword in FLOW_KEYWORDS):
        return "mermaid"
    return None


def check_asset(format_value: str, data_value: str, location: str, report: Report, validator: str = "visual-assets") -> None:
    fmt = cell(format_value).lower()
    data = cell(data_value)
    if fmt and not data:
        report.add("error", validator, location, f"Asset format {fmt!r} set but asset data is empty.")
        return
    if not fmt and data:
        report.add("warning", validator, location, "Asset data present but asset format is empty.")
        return
    if not fmt:
        return
    if fmt not in {"mermaid", "svg"}:
        report.add("warning", validator, location, f"Unknown asset format {fmt!r}; expected mermaid or svg.")
    if fmt == "svg" and not starts_like_svg(data):
        report.add("error", validator, location, "SVG asset does not look like complete <svg>...</svg> markup.")
    if fmt == "mermaid" and not starts_like_mermaid(data):
        report.add("warning", validator, location, "Mermaid asset does not start with a known Mermaid diagram type.")


def validate_visual_assets(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    concept_formats = Counter()
    question_formats = Counter()
    homework_formats = Counter()

    for row in data["Concepts"]:
        loc = row.get("concept_id", "")
        fmt = cell(row.get("visual_type")).lower()
        visual = cell(row.get("visual_data"))
        if fmt and visual:
            concept_formats[fmt] += 1
        check_asset(fmt, visual, loc, report)
        expected = expected_visual_format(" ".join([row.get("concept_title", ""), row.get("explanation", ""), row.get("topic_id", "")]))
        if expected and fmt and fmt != expected:
            report.add("warning", "visual-assets", loc, f"Visual may be better as {expected!r} than {fmt!r}.")

    for row in data["Questions"]:
        loc = row.get("Question ID", "")
        fmt = cell(row.get("Asset Format")).lower()
        asset = cell(row.get("Asset Data"))
        image_url = cell(row.get("Image URL"))
        if fmt and asset:
            question_formats[fmt] += 1
        check_asset(fmt, asset, loc, report)
        if fmt and image_url and not asset:
            report.add("warning", "visual-assets", loc, "Question uses Image URL without inline Asset Data; app rendering may depend on external access.")
        expected = expected_visual_format(" ".join([row.get("Topic", ""), row.get("Subtopic", ""), row.get("Question", "")]))
        if expected and fmt and fmt != expected:
            report.add("warning", "visual-assets", loc, f"Question visual may be better as {expected!r} than {fmt!r}.")

    for row in data["Homework"]:
        loc = row.get("homework_id", "")
        fmt = cell(row.get("asset_format")).lower()
        asset = cell(row.get("asset_data"))
        if fmt and asset:
            homework_formats[fmt] += 1
        check_asset(fmt, asset, loc, report)
        expected = expected_visual_format(" ".join([row.get("set_title", ""), row.get("question_text", "")]))
        if expected and fmt and fmt != expected:
            report.add("warning", "visual-assets", loc, f"Homework visual may be better as {expected!r} than {fmt!r}.")

    report.stats["visual_formats"] = {
        "concepts": dict(concept_formats),
        "questions": dict(question_formats),
        "homework": dict(homework_formats),
    }


def validate_homework(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    homework_by_topic = defaultdict(list)
    for row in data["Homework"]:
        homework_by_topic[row.get("topic_id", "")].append(row)

    for topic in data["Topic_Map"]:
        tid = topic.get("topic_id", "")
        rows = homework_by_topic[tid]
        if not rows:
            report.add("warning", "homework-quality", tid, "No homework covers this topic.")
        elif len(rows) < 2:
            report.add("warning", "homework-quality", tid, "Only one homework row covers this topic.")

    for row in data["Homework"]:
        hid = row.get("homework_id", "")
        text = cell(row.get("question_text"))
        answer = cell(row.get("answer"))
        explanation = cell(row.get("explanation"))
        if len(text.split()) < 8:
            report.add("warning", "homework-quality", hid, "Homework prompt is too short.")
        if not any(verb in text.lower() for verb in EXPLORATORY_VERBS):
            report.add("warning", "homework-quality", hid, "Homework may not encourage exploration, reasoning, or practice.")
        if len(answer.split()) < 4:
            report.add("warning", "homework-quality", hid, "Homework answer is too thin.")
        if len(explanation.split()) < 4:
            report.add("warning", "homework-quality", hid, "Homework explanation is too thin.")


def validate_question_bank(data: dict[str, list[dict[str, str]]], report: Report) -> None:
    questions_by_chapter = defaultdict(list)
    topic_coverage = defaultdict(set)
    for row in data["Questions"]:
        ch = cell(row.get("Chapter No."))
        questions_by_chapter[ch].append(row)
        topic_coverage[(ch, row.get("Chapter", ""))].add(cell(row.get("Topic")))

    for chapter in data["Chapter_Map"]:
        ch_no = cell(chapter.get("chapter_no"))
        rows = questions_by_chapter[ch_no]
        if len(rows) < 20:
            report.add("warning", "question-bank", ch_no, f"Only {len(rows)} questions in chapter.")
        qtypes = Counter(cell(r.get("Question Type")) for r in rows)
        difficulties = Counter(cell(r.get("Difficulty")) for r in rows)
        if rows and len(qtypes) < 4:
            report.add("warning", "question-bank", ch_no, f"Low question-type variety: {dict(qtypes)}.")
        if rows and len(difficulties) < 3:
            report.add("warning", "question-bank", ch_no, f"Difficulty mix is narrow: {dict(difficulties)}.")

    for row in data["Questions"]:
        qid = row.get("Question ID", "")
        qtype = cell(row.get("Question Type"))
        question = cell(row.get("Question"))
        answer = cell(row.get("Answer / Solution"))
        explanation = cell(row.get("Explanation"))
        marks = parse_int(row.get("Marks", "0"))
        if len(question.split()) < 6:
            report.add("warning", "question-bank", qid, "Question text is very short.")
        if marks <= 0:
            report.add("error", "question-bank", qid, "Marks must be positive.")
        if not answer:
            report.add("error", "question-bank", qid, "Answer / Solution is missing.")
        if len(explanation.split()) < 4:
            report.add("warning", "question-bank", qid, "Explanation is too thin.")
        if qtype == "MCQ":
            options = {cell(row.get(option)) for option in ("Option A", "Option B", "Option C", "Option D") if cell(row.get(option))}
            for option in ("Option A", "Option B", "Option C", "Option D"):
                if not cell(row.get(option)):
                    report.add("error", "question-bank", qid, f"MCQ missing {option}.")
            correct = cell(row.get("Correct Answer"))
            if not correct:
                report.add("error", "question-bank", qid, "MCQ missing Correct Answer.")
            elif correct not in {"A", "B", "C", "D"} and correct not in options:
                report.add("error", "question-bank", qid, "MCQ Correct Answer must be A-D or exactly match one option.")

    report.stats["question_types_by_chapter"] = {
        ch: dict(Counter(r.get("Question Type", "") for r in rows))
        for ch, rows in sorted(questions_by_chapter.items(), key=lambda item: parse_int(item[0]))
    }


def render_markdown(report: Report) -> str:
    severity_counts = Counter(f.severity for f in report.findings)
    validator_counts = Counter(f.validator for f in report.findings)
    status = "PASS" if not report.errors else "FAIL"

    lines = [
        "# SAH Subject Content Validation Report",
        "",
        f"- Source folder: `{report.source_dir}`",
        f"- Status: **{status}**",
        f"- Errors: {severity_counts.get('error', 0)}",
        f"- Warnings: {severity_counts.get('warning', 0)}",
        "",
        "## Row Counts",
        "",
    ]
    for sheet, count in report.stats.get("rows", {}).items():
        lines.append(f"- {sheet}: {count}")

    lines += ["", "## Visual Formats", ""]
    for area, formats in report.stats.get("visual_formats", {}).items():
        lines.append(f"- {area}: {formats}")

    lines += ["", "## Findings By Validator", ""]
    if validator_counts:
        for validator, count in validator_counts.most_common():
            lines.append(f"- {validator}: {count}")
    else:
        lines.append("- No findings.")

    lines += ["", "## Findings", ""]
    if not report.findings:
        lines.append("No issues found.")
    else:
        for finding in report.findings:
            lines.append(f"- **{finding.severity.upper()}** `{finding.validator}` `{finding.location}`: {finding.message}")

    lines += ["", "## Machine Stats", "", "```json", json.dumps(report.stats, indent=2, ensure_ascii=False), "```", ""]
    return "\n".join(lines)


def run(source_dir: Path) -> Report:
    report = Report(source_dir=source_dir)
    data = load_subject(source_dir, report)
    validate_schema(data, report)
    validate_concepts(data, report)
    validate_misconceptions(data, report)
    validate_visual_assets(data, report)
    validate_homework(data, report)
    validate_question_bank(data, report)
    return report


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run SAH content pipeline validators against a subject workbook CSV folder.")
    parser.add_argument("--source-dir", required=True, type=Path, help="Folder containing the seven subject workbook CSV files.")
    parser.add_argument("--report", type=Path, help="Where to write the markdown report. Defaults to validation-report.md in source-dir.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on warnings as well as errors.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_dir = args.source_dir.expanduser().resolve()
    report_path = (args.report or source_dir / "validation-report.md").expanduser().resolve()
    report = run(source_dir)
    markdown = render_markdown(report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(markdown, encoding="utf-8")
    print(report_path)
    print(f"errors={len(report.errors)} warnings={len(report.warnings)}")
    if report.errors:
        return 1
    if args.strict and report.warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
