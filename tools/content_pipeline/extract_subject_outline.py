#!/usr/bin/env python3
"""Create compact chapter outline packets from source text files.

This is intentionally extractive: it does not generate teaching content. The
output is a small planning aid so subject generation can avoid repeatedly
loading whole chapters into the model context.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SUPPORTED_EXTENSIONS = {".md", ".txt"}
NOISE_PATTERNS = (
    re.compile(r"^Chapter \d+\.indd", re.IGNORECASE),
    re.compile(r"^Reprint \d{4}-\d{2}$", re.IGNORECASE),
    re.compile(r"^\d+$"),
    re.compile(r"^[A-Z]$"),
    re.compile(r"^[a-z]$"),
)
SECTION_HINTS = {
    "before we move on",
    "questions and activities",
    "let's explore",
    "lets explore",
    "think about it",
    "don't miss out",
    "dont miss out",
    "let's remember",
    "lets remember",
    "the big",
    "questions",
}


@dataclass
class Outline:
    path: Path
    title: str
    big_questions: list[str]
    headings: list[str]
    figures: list[str]
    summary: list[str]
    exercises: list[str]
    key_terms: list[str]
    evidence: list[str]


def clean_line(line: str) -> str:
    line = line.replace("\ufeff", "").replace("\x0c", "")
    line = re.sub(r"\s+", " ", line).strip()
    return line.strip(" \t")


def is_noise(line: str) -> bool:
    return not line or any(pattern.search(line) for pattern in NOISE_PATTERNS)


def usable_lines(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = [clean_line(line) for line in text.splitlines()]
    return [line for line in lines if not is_noise(line)]


def compact_title(lines: list[str], fallback: str) -> str:
    candidates: list[str] = []
    for line in lines[:40]:
        lower = line.lower()
        if lower in SECTION_HINTS or lower.startswith("fig."):
            break
        if line.startswith(("―", "—", "-")):
            continue
        if candidates and len(line.split()) > 8:
            break
        if candidates and line.endswith((".", "?", "!”", "”")):
            break
        if len(line) <= 3 or len(line) > 90:
            continue
        if re.search(r"\b(indd|reprint|grade|part)\b", lower):
            continue
        candidates.append(re.sub(r"\s+\d+\s*$", "", line).strip())
        if len(candidates) >= 3:
            break
    title = " ".join(candidates).strip()
    title = re.sub(r"\b\d+\s*$", "", title).strip()
    return title or fallback


def looks_like_heading(line: str) -> bool:
    lower = line.lower()
    if lower in SECTION_HINTS:
        return True
    if line.startswith(("Fig.", "Figure ", "Æ", "-", "*", "―", "—")):
        return False
    if re.search(r"\b(indd|reprint|chapter \d|grade|part)\b", lower):
        return False
    if lower.startswith(("and ", "or ", "but ", "of ", "in ", "to ")):
        return False
    if lower in {"arabian", "indian", "ocean", "bay of", "bengal", "legend", "coal", "oil", "iron ore", "bauxite"}:
        return False
    if len(line) < 6 or len(line) > 86:
        return False
    if line.endswith("."):
        return False
    words = line.split()
    if len(words) > 9:
        return False
    titleish = sum(1 for word in words if word[:1].isupper() or word.lower() in {"and", "of", "the", "in", "to"})
    return titleish >= max(2, len(words) - 1)


def merge_numbered_blocks(lines: list[str], start_index: int, limit: int) -> list[str]:
    blocks: list[str] = []
    current = ""
    found_first = False
    for line in lines[start_index + 1 : start_index + 90]:
        lower = line.lower()
        if lower.startswith("fig.") and not found_first:
            continue
        if found_first and (lower.startswith("fig.") or re.search(r"\b(indd|reprint)\b", lower)):
            break
        if lower in SECTION_HINTS and found_first:
            break
        numbered = re.match(r"^(\d+)\.\s*(.*)", line)
        if numbered:
            if current:
                blocks.append(current.strip())
                if len(blocks) >= limit:
                    break
            current = line
            found_first = True
            continue
        if found_first:
            if current.endswith("?"):
                blocks.append(current.strip())
                break
            if looks_like_heading(line) and len(line.split()) <= 5:
                break
            if len(line.split()) <= 14:
                current = f"{current} {line}".strip()
            if len(current.split()) > 70:
                blocks.append(current.strip())
                current = ""
                break
    if current and len(blocks) < limit:
        blocks.append(current.strip())
    return blocks


def merge_bullets_or_numbered(lines: list[str], start_index: int, limit: int) -> list[str]:
    blocks: list[str] = []
    current = ""
    for line in lines[start_index + 1 : start_index + 140]:
        lower = line.lower()
        starts_item = bool(re.match(r"^(?:\d+\.|Æ|[-*])\s*", line))
        if current and (lower.startswith("fig.") or re.search(r"\b(indd|reprint)\b", lower)):
            blocks.append(current.strip())
            break
        if lower in SECTION_HINTS and blocks:
            break
        if starts_item:
            if current:
                blocks.append(current.strip())
                if len(blocks) >= limit:
                    break
            current = line
        elif current and len(line.split()) <= 16:
            if current.endswith("?"):
                blocks.append(current.strip())
                current = ""
                break
            current = f"{current} {line}".strip()
            if len(current.split()) > 90:
                blocks.append(current.strip())
                current = ""
                break
        elif current:
            blocks.append(current.strip())
            current = ""
            if len(blocks) >= limit:
                break
    if current and len(blocks) < limit:
        blocks.append(current.strip())
    return blocks


def collect_after(lines: list[str], start_index: int, limit: int) -> list[str]:
    collected: list[str] = []
    for line in lines[start_index + 1 :]:
        lower = line.lower()
        if lower in SECTION_HINTS and collected:
            break
        if looks_like_heading(line) and collected:
            break
        if len(line.split()) >= 4:
            collected.append(line)
        if len(collected) >= limit:
            break
    return collected


def numbered_or_prompt(line: str) -> bool:
    return bool(re.match(r"^(?:\d+\.|\([ivx]+\)|[a-z]\))\s+", line, re.IGNORECASE)) or line.endswith("?")


def dedupe(values: Iterable[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
        if len(out) >= limit:
            break
    return out


def extract_outline(path: Path, max_evidence: int) -> Outline:
    lines = usable_lines(path)
    title = compact_title(lines, path.stem)
    figures = dedupe((line for line in lines if line.lower().startswith(("fig.", "figure "))), 20)
    headings = dedupe((line for line in lines if looks_like_heading(line)), 32)

    big_questions: list[str] = []
    summary: list[str] = []
    exercises: list[str] = []
    key_terms: list[str] = []

    for idx, line in enumerate(lines):
        lower = line.lower()
        if lower == "questions" and idx > 0 and lines[idx - 1].lower() == "the big":
            big_questions = merge_numbered_blocks(lines, idx, 8)
        elif lower == "before we move on":
            summary = merge_bullets_or_numbered(lines, idx, 10)
        elif lower == "questions and activities":
            exercises = [item for item in merge_bullets_or_numbered(lines, idx, 14) if numbered_or_prompt(item)]
        elif re.search(r"\s*:\s*$", line) and 1 <= len(line.split()) <= 4:
            term = line.rstrip(": ").strip()
            if term:
                key_terms.append(term)

    signal_words = (
        "because", "therefore", "however", "for example", "this means",
        "in other words", "as a result", "connect", "impact", "resource",
        "government", "trade", "election", "production", "parliament",
    )
    evidence = [
        line
        for line in lines
        if 10 <= len(line.split()) <= 36 and any(word in line.lower() for word in signal_words)
    ]

    return Outline(
        path=path,
        title=title,
        big_questions=dedupe(big_questions, 8),
        headings=headings,
        figures=figures,
        summary=dedupe(summary, 10),
        exercises=dedupe(exercises, 14),
        key_terms=dedupe(key_terms, 20),
        evidence=dedupe(evidence, max_evidence),
    )


def render_section(title: str, items: list[str]) -> list[str]:
    lines = [f"## {title}", ""]
    if not items:
        lines.append("- Not detected.")
    else:
        lines.extend(f"- {item}" for item in items)
    lines.append("")
    return lines


def render_outline(outline: Outline) -> str:
    lines = [
        f"# {outline.title}",
        "",
        f"- Source: `{outline.path}`",
        "",
    ]
    lines += render_section("Big Questions", outline.big_questions)
    lines += render_section("Major Headings", outline.headings)
    lines += render_section("Figures And Captions", outline.figures)
    lines += render_section("Summary / Before We Move On", outline.summary)
    lines += render_section("Exercises / Activities", outline.exercises)
    lines += render_section("Key Terms", outline.key_terms)
    lines += render_section("Selected Evidence Lines", outline.evidence)
    return "\n".join(lines).rstrip() + "\n"


def default_output_dir(source_dir: Path) -> Path:
    subject_dir = source_dir.parent if source_dir.name.lower() in {"markdown", "ncert", "source"} else source_dir
    return subject_dir / "generated" / "outlines"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extract compact subject/chapter outlines from Markdown/text sources.")
    parser.add_argument("--source-dir", type=Path, required=True, help="Folder containing chapter .md/.txt files.")
    parser.add_argument("--output-dir", type=Path, help="Where to write compact outline markdown files.")
    parser.add_argument("--include-regex", default="", help="Only include files whose name/path matches this regex.")
    parser.add_argument("--exclude-regex", default="", help="Exclude files whose name/path matches this regex.")
    parser.add_argument("--max-evidence-lines", type=int, default=18, help="Maximum selected evidence lines per chapter.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_dir = args.source_dir.expanduser().resolve()
    output_dir = (args.output_dir.expanduser().resolve() if args.output_dir else default_output_dir(source_dir))
    include_re = re.compile(args.include_regex, re.IGNORECASE) if args.include_regex else None
    exclude_re = re.compile(args.exclude_regex, re.IGNORECASE) if args.exclude_regex else None

    files = [
        path
        for path in sorted(source_dir.iterdir())
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    if include_re:
        files = [path for path in files if include_re.search(str(path))]
    if exclude_re:
        files = [path for path in files if not exclude_re.search(str(path))]

    output_dir.mkdir(parents=True, exist_ok=True)
    outlines = [extract_outline(path, args.max_evidence_lines) for path in files]
    index_lines = ["# Subject Outline Index", ""]
    for idx, outline in enumerate(outlines, start=1):
        out_path = output_dir / f"ch-{idx:02d}-{path_slug(outline.title)}.md"
        out_path.write_text(render_outline(outline), encoding="utf-8")
        index_lines.append(f"- Chapter {idx}: [{outline.title}]({out_path.name})")
    (output_dir / "subject-outline.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    print(f"Outlines written: {len(outlines)}")
    print(output_dir)
    return 0


def path_slug(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return cleaned.strip("-") or "untitled"


if __name__ == "__main__":
    raise SystemExit(main())
