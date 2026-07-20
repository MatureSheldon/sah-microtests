#!/usr/bin/env python3
"""Prepare a class/subject content-generation workspace from source chapters.

This script is intentionally conservative. It does not call an LLM. It creates
the folder structure, source manifest, empty app-schema CSVs when needed, and
chapter-specific prompt packets that Codex/agents can use to generate content.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from validate_subject_workbook import ALL_FILES, REQUIRED_FILES


SUPPORTED_SOURCE_EXTENSIONS = {".md", ".txt", ".pdf"}


@dataclass
class ChapterSource:
    chapter_no: int
    title: str
    source_path: str
    file_name: str
    extension: str
    status: str


def pad_class(class_level: str) -> str:
    return str(class_level).zfill(2)


def slug(value: str) -> str:
    cleaned = value.strip().lower().replace("&", "and").replace("+", "plus")
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    return cleaned.strip("-") or "untitled"


def default_subject_dir(content_root: Path, class_level: str, subject: str) -> Path:
    return content_root / f"class-{pad_class(class_level)}" / subject


def first_text_lines(path: Path, limit: int = 60) -> list[str]:
    if path.suffix.lower() == ".pdf":
        return []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    return [line.strip() for line in text.splitlines()[:limit] if line.strip()]


def infer_chapter_no(path: Path, fallback: int) -> int:
    candidates = [
        path.stem,
        path.name,
        " ".join(first_text_lines(path, limit=20)),
    ]
    patterns = [
        r"(?:chapter|ch)[^\d]{0,4}(\d{1,2})\b",
        r"\b(\d{1,2})\b",
    ]
    for candidate in candidates:
        for pattern in patterns:
            match = re.search(pattern, candidate, flags=re.IGNORECASE)
            if match:
                return int(match.group(1))
    return fallback


def clean_title(value: str) -> str:
    value = re.sub(r"^#+\s*", "", value).strip()
    value = re.sub(r"^(?:chapter|ch)\s*\d{1,2}\s*[:.\-–—]?\s*", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" -:") or "Untitled Chapter"


def initial_title_block(lines: list[str]) -> str:
    title_lines: list[str] = []
    seen_title_text = False
    for line in lines[:16]:
        lower = line.lower()
        if lower.startswith(("probe and ponder", "math talk")):
            break
        if re.fullmatch(r"\d{1,2}", line):
            if not seen_title_text:
                continue
            break
        if re.match(r"^\d{1,2}\.\d+", line):
            break
        if "indd" in lower:
            continue
        if line.startswith(("z ", "•", "-", "*")):
            continue
        if len(line) > 90:
            continue
        if seen_title_text and len(line) > 38 and not line.isupper():
            break
        cleaned = clean_title(line)
        if cleaned:
            title_lines.append(cleaned)
            seen_title_text = True
        if len(title_lines) >= 4:
            break
    return clean_title(" ".join(part for part in title_lines if part))


def infer_title(path: Path, chapter_no: int) -> str:
    lines = first_text_lines(path)
    for line in lines:
        if line.startswith("#"):
            title = clean_title(line)
            if title:
                return title
    block_title = initial_title_block(lines)
    if block_title and not re.fullmatch(r"untitled chapter", block_title, flags=re.IGNORECASE):
        return block_title
    for line in lines[:12]:
        if re.search(r"(?:chapter|ch)\s*" + re.escape(str(chapter_no)), line, flags=re.IGNORECASE):
            title = clean_title(line)
            if title:
                return title
    stem = re.sub(r"^[a-z]*\d{2,4}[-_ ]*", "", path.stem, flags=re.IGNORECASE)
    stem = stem.replace("-", " ").replace("_", " ")
    return clean_title(stem).title()


def is_excluded(path: Path, exclude_patterns: list[str]) -> bool:
    target = f"{path.name}\n{path}"
    return any(re.search(pattern, target, flags=re.IGNORECASE) for pattern in exclude_patterns)


def discover_sources(source_dir: Path, exclude_patterns: list[str], renumber_sequential: bool) -> list[ChapterSource]:
    files = [
        path
        for path in sorted(source_dir.iterdir())
        if path.is_file() and path.suffix.lower() in SUPPORTED_SOURCE_EXTENSIONS
        and not is_excluded(path, exclude_patterns)
    ]
    chapters: list[ChapterSource] = []
    used_numbers: set[int] = set()
    for index, path in enumerate(files, start=1):
        chapter_no = index if renumber_sequential else infer_chapter_no(path, index)
        while chapter_no in used_numbers:
            chapter_no += 1
        used_numbers.add(chapter_no)
        chapters.append(
            ChapterSource(
                chapter_no=chapter_no,
                title=infer_title(path, chapter_no),
                source_path=str(path),
                file_name=path.name,
                extension=path.suffix.lower().lstrip("."),
                status="source_available",
            )
        )
    return sorted(chapters, key=lambda item: item.chapter_no)


def write_empty_csvs(subject_workbook_dir: Path, force: bool) -> list[str]:
    created: list[str] = []
    subject_workbook_dir.mkdir(parents=True, exist_ok=True)
    for _sheet_name, (file_name, headers) in ALL_FILES.items():
        path = subject_workbook_dir / file_name
        if path.exists() and not force:
            continue
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
        created.append(file_name)
    return created


def apply_existing_chapter_titles(subject_workbook_dir: Path, chapters: list[ChapterSource]) -> None:
    chapter_map = subject_workbook_dir / "Chapter_Map.csv"
    if not chapter_map.exists():
        return
    try:
        with chapter_map.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    except OSError:
        return
    titles = [row.get("chapter_title", "").strip() for row in rows if row.get("chapter_title", "").strip()]
    if len(titles) != len(chapters):
        return
    for chapter, title in zip(chapters, titles):
        chapter.title = title


def clean_prompt_dir(prompts_dir: Path) -> int:
    if not prompts_dir.exists():
        return 0
    removed = 0
    for path in prompts_dir.glob("ch-*.md"):
        path.unlink()
        removed += 1
    return removed


def source_excerpt(path: Path, max_chars: int = 9000) -> str:
    if path.suffix.lower() == ".pdf":
        return (
            "[PDF source detected. Extract the chapter text first, or read the PDF directly "
            "before generating rows. Do not generate from title alone.]"
        )
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError as error:
        return f"[Could not read source: {error}]"
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n\n[Excerpt truncated. Read the full source file before final generation.]"


def prompt_text(class_level: str, subject: str, chapter: ChapterSource) -> str:
    draft_file = f"ch-{chapter.chapter_no:02d}-{slug(chapter.title)}.json"
    return f"""# SAH Chapter Content Generation Prompt

You are generating app-ready study content for Scholars Academic Home.

Class: {class_level}
Subject: {subject}
Chapter No.: {chapter.chapter_no}
Chapter Title: {chapter.title}
Source file: {chapter.source_path}

## Non-Negotiable Rules

- Read the full source chapter before writing final rows.
- Use the source as the truth; do not add out-of-syllabus facts unless clearly useful as a local example.
- Extract the chapter's actual teachable topics. Do not force a fixed count; use fewer or more when coverage demands it.
- Every concept must explain one must-have idea in teacher-friendly language.
- Misconceptions must be complete corrective points, preferably newline-separated.
- Homework must be exploratory and untimed: observe, draw, compare, classify, explain, justify, measure, model, investigate, interview, design, or reflect.
- Question-bank rows are for timed microtests and must be clear, tagged, difficulty-balanced, and reusable.
- Add Mermaid or SVG assets only where they deepen understanding.
- Use SVG for spatial/scientific/mathematical diagrams; use Mermaid for flows, cycles, trees, timelines, and relationships.
- Same-row assets only: asset_format/asset_data for Homework and Asset Format/Asset Data for Questions.
- Add mastery bands: Must Know, Should Know, or Stretch.
- Include worked examples for important solved-problem patterns.
- Set review fields to ai_reviewed initially; teacher approval happens later.

## Required Output

Return one valid JSON object. The object must contain these exact array fields:

- Chapter_Map.csv
- Topic_Map.csv
- Lesson_Plans.csv
- Concepts.csv
- Homework.csv
- Resources.csv
- Questions.csv
- Worked_Examples.csv
- Teacher_Review.csv

Use these JSON keys, without `.csv`:

```json
{{
  "metadata": {{
    "class": "{class_level}",
    "subject": "{subject}",
    "chapter_no": "{chapter.chapter_no}",
    "chapter_title": "{chapter.title}",
    "source_file": "{chapter.source_path}"
  }},
  "Chapter_Map": [],
  "Topic_Map": [],
  "Lesson_Plans": [],
  "Concepts": [],
  "Homework": [],
  "Resources": [],
  "Questions": [],
  "Worked_Examples": [],
  "Teacher_Review": []
}}
```

Every row object inside each array must use the exact CSV column names. Do not
invent extra columns. Use empty strings for unused optional fields.

Save the final JSON draft as:

```text
generated/drafts/{draft_file}
```

Then apply it:

```bash
python3 tools/content_pipeline/apply_chapter_draft.py \\
  --subject-workbook-dir /Users/adityabhatt/Documents/SAH_Content_Library/class-{pad_class(class_level)}/{subject}/generated/subject-workbook \\
  --draft /Users/adityabhatt/Documents/SAH_Content_Library/class-{pad_class(class_level)}/{subject}/generated/drafts/{draft_file}
```

After appending, validate and build:

```bash
python3 tools/content_pipeline/run_subject_pipeline.py --class {class_level} --subject {subject}
```

## Source Excerpt

```text
{source_excerpt(Path(chapter.source_path))}
```
"""


def write_prompts(prompts_dir: Path, class_level: str, subject: str, chapters: list[ChapterSource], force: bool) -> list[str]:
    prompts_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for chapter in chapters:
        path = prompts_dir / f"ch-{chapter.chapter_no:02d}-{slug(chapter.title)}.md"
        if path.exists() and not force:
            continue
        path.write_text(prompt_text(class_level, subject, chapter), encoding="utf-8")
        written.append(path.name)
    return written


def write_plan(generated_dir: Path, class_level: str, subject: str, chapters: list[ChapterSource]) -> Path:
    path = generated_dir / "subject-generation-plan.md"
    lines = [
        "# SAH Subject Generation Plan",
        "",
        f"- Class: {class_level}",
        f"- Subject: {subject}",
        f"- Chapters detected: {len(chapters)}",
        f"- Created at: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Workflow",
        "",
        "1. Read each source chapter completely.",
        "2. Generate chapter rows into the seven subject workbook CSVs.",
        "3. Run `python3 tools/content_pipeline/run_subject_pipeline.py --class "
        f"{class_level} --subject {subject}`.",
        "4. Review `validation-report.md` warnings.",
        "5. Fix content issues, rebuild, then import the workbook into Google Sheets.",
        "",
        "## Chapters",
        "",
    ]
    for chapter in chapters:
        lines.append(f"- Ch {chapter.chapter_no}: {chapter.title} (`{chapter.file_name}`)")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepare an SAH subject content-generation workspace.")
    parser.add_argument("--class", dest="class_level", required=True, help="Class level, for example 8.")
    parser.add_argument("--subject", required=True, help="Subject name, for example Science.")
    parser.add_argument(
        "--content-root",
        type=Path,
        default=Path.home() / "Documents" / "SAH_Content_Library",
        help="Root folder containing class/subject content.",
    )
    parser.add_argument("--source-dir", type=Path, help="Folder containing NCERT/source chapter files.")
    parser.add_argument("--force", action="store_true", help="Overwrite generated prompts and empty CSV headers.")
    parser.add_argument(
        "--exclude-regex",
        action="append",
        default=[],
        help="Regex matched against source filename/path to exclude non-chapter files. Can be repeated.",
    )
    parser.add_argument(
        "--renumber-sequential",
        action="store_true",
        help="Ignore chapter numbers inferred from files and number included sources from 1.",
    )
    parser.add_argument(
        "--clean-prompts",
        action="store_true",
        help="Delete existing generated chapter prompt files before writing new prompt packets.",
    )
    args = parser.parse_args(list(argv) if argv is not None else None)

    subject_dir = default_subject_dir(args.content_root.expanduser(), args.class_level, args.subject).resolve()
    source_dir = (args.source_dir.expanduser() if args.source_dir else subject_dir / "source" / "ncert").resolve()
    generated_dir = subject_dir / "generated"
    subject_workbook_dir = generated_dir / "subject-workbook"
    prompts_dir = generated_dir / "prompts"
    drafts_dir = generated_dir / "drafts"

    if not source_dir.exists():
        raise SystemExit(f"Source folder not found: {source_dir}")

    default_excludes = [r"prelim", r"0[_-]?prelims", r"ps\.(md|txt|pdf)$"]
    chapters = discover_sources(source_dir, default_excludes + args.exclude_regex, args.renumber_sequential)
    if not chapters:
        raise SystemExit(f"No supported source files found in {source_dir}")

    generated_dir.mkdir(parents=True, exist_ok=True)
    drafts_dir.mkdir(parents=True, exist_ok=True)
    created_csvs = write_empty_csvs(subject_workbook_dir, args.force)
    apply_existing_chapter_titles(subject_workbook_dir, chapters)
    removed_prompts = clean_prompt_dir(prompts_dir) if args.clean_prompts else 0
    written_prompts = write_prompts(prompts_dir, args.class_level, args.subject, chapters, args.force)
    plan_path = write_plan(generated_dir, args.class_level, args.subject, chapters)

    manifest = {
        "pipeline": "sah-subject-generation-prep",
        "class": args.class_level,
        "subject": args.subject,
        "source_dir": str(source_dir),
        "generated_dir": str(generated_dir),
        "subject_workbook_dir": str(subject_workbook_dir),
        "prompts_dir": str(prompts_dir),
        "drafts_dir": str(drafts_dir),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "chapters": [asdict(chapter) for chapter in chapters],
        "created_csvs": created_csvs,
        "removed_prompts": removed_prompts,
        "written_prompts": written_prompts,
    }
    manifest_path = generated_dir / "source-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Prepared generation workspace: {generated_dir}")
    print(f"Detected chapters: {len(chapters)}")
    print(f"Plan: {plan_path}")
    print(f"Manifest: {manifest_path}")
    print(f"Prompt packets written: {len(written_prompts)}")
    if removed_prompts:
        print(f"Old prompt packets removed: {removed_prompts}")
    print(f"CSV headers created: {len(created_csvs)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
