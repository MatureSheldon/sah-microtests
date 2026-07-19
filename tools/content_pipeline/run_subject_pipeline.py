#!/usr/bin/env python3
"""Run the repeatable SAH subject-content pipeline for prepared workbook CSVs.

This is the deterministic part of the larger NCERT-to-workbook system. It does
not generate new educational content by itself. It assumes the seven subject
CSV files already exist, then validates them, builds the Excel workbook, runs
the workbook validator, and writes a pipeline manifest.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = REPO_ROOT / "tools" / "content_pipeline" / "validate_subject_workbook.py"
WORKBOOK_BUILDER = REPO_ROOT / "tools" / "content_workbook" / "build_subject_workbook.mjs"
WORKBOOK_VALIDATOR = REPO_ROOT / "tools" / "question_bank_agent" / "validate_workbook.py"


def slug(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("&", "and")
        .replace("+", "plus")
        .replace("/", "-")
        .replace("\\", "-")
        .replace(" ", "-")
    )


def pad_class(class_level: str) -> str:
    return str(class_level).zfill(2)


def default_subject_dir(content_root: Path, class_level: str, subject: str) -> Path:
    return content_root / f"class-{pad_class(class_level)}" / subject


def default_workbook_path(subject_workbook_dir: Path, class_level: str, subject: str) -> Path:
    return subject_workbook_dir / f"class-{pad_class(class_level)}-{slug(subject)}-subject-workbook.xlsx"


def run_command(command: list[str], cwd: Path, env: dict[str, str] | None = None) -> dict[str, object]:
    started = datetime.now(timezone.utc).isoformat()
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return {
        "command": command,
        "started_at": started,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "returncode": result.returncode,
        "stdout": result.stdout.strip(),
        "stderr": result.stderr.strip(),
    }


def require_files(source_dir: Path) -> list[str]:
    required = [
        "Chapter_Map.csv",
        "Topic_Map.csv",
        "Lesson_Plans.csv",
        "Concepts.csv",
        "Homework.csv",
        "Resources.csv",
        "Questions.csv",
    ]
    return [name for name in required if not (source_dir / name).exists()]


def detect_node() -> str:
    bundled_node = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "node"
        / "bin"
        / "node"
    )
    if bundled_node.exists():
        return str(bundled_node)
    node = shutil.which("node")
    if node:
        return node
    raise RuntimeError("Node.js was not found. Install Node or use the Codex bundled runtime.")


def write_manifest(path: Path, manifest: dict[str, object]) -> None:
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and build a prepared SAH subject workbook.")
    parser.add_argument("--class", dest="class_level", required=True, help="Class level, for example 8.")
    parser.add_argument("--subject", required=True, help="Subject name, for example Science.")
    parser.add_argument("--subject-id", default="", help="Optional subject id used in workbook README.")
    parser.add_argument(
        "--content-root",
        type=Path,
        default=Path.home() / "Documents" / "SAH_Content_Library",
        help="Root folder containing class/subject content.",
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        help="Folder containing the seven subject workbook CSVs. Defaults to <content-root>/class-XX/<Subject>/generated/subject-workbook.",
    )
    parser.add_argument("--output", type=Path, help="Workbook output path. Defaults inside source-dir.")
    parser.add_argument("--strict", action="store_true", help="Fail if the content validator reports warnings.")
    parser.add_argument("--skip-workbook-build", action="store_true", help="Only run validation/reporting.")
    parser.add_argument("--skip-workbook-validate", action="store_true", help="Do not run the existing XLSX validator.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    subject_dir = default_subject_dir(args.content_root.expanduser(), args.class_level, args.subject)
    source_dir = (
        args.source_dir.expanduser()
        if args.source_dir
        else subject_dir / "generated" / "subject-workbook"
    ).resolve()
    output_path = (args.output.expanduser().resolve() if args.output else default_workbook_path(source_dir, args.class_level, args.subject))
    manifest_path = source_dir / "pipeline-manifest.json"

    manifest: dict[str, object] = {
        "pipeline": "sah-prepared-subject-workbook",
        "class": args.class_level,
        "subject": args.subject,
        "subject_id": args.subject_id,
        "source_dir": str(source_dir),
        "output": str(output_path),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "stages": [],
    }

    missing = require_files(source_dir)
    if missing:
        manifest["status"] = "failed"
        manifest["missing_files"] = missing
        source_dir.mkdir(parents=True, exist_ok=True)
        write_manifest(manifest_path, manifest)
        print(f"Missing required CSV files in {source_dir}: {', '.join(missing)}", file=sys.stderr)
        print(manifest_path)
        return 2

    validate_cmd = [sys.executable, str(VALIDATOR), "--source-dir", str(source_dir)]
    if args.strict:
        validate_cmd.append("--strict")
    stage = run_command(validate_cmd, REPO_ROOT)
    manifest["stages"].append({"name": "content_validation", **stage})
    if stage["returncode"] != 0:
        manifest["status"] = "failed"
        manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
        write_manifest(manifest_path, manifest)
        print(stage["stdout"])
        print(stage["stderr"], file=sys.stderr)
        print(manifest_path)
        return int(stage["returncode"])

    if not args.skip_workbook_build:
        node = detect_node()
        env = os.environ.copy()
        node_modules = Path(node).parents[1] / "node_modules"
        if node_modules.exists():
            env["NODE_PATH"] = str(node_modules)
        build_cmd = [
            node,
            str(WORKBOOK_BUILDER),
            "--source-dir",
            str(source_dir),
            "--class",
            str(args.class_level),
            "--subject",
            args.subject,
        ]
        if args.subject_id:
            build_cmd += ["--subject-id", args.subject_id]
        build_cmd += ["--output", str(output_path)]
        stage = run_command(build_cmd, REPO_ROOT, env=env)
        manifest["stages"].append({"name": "workbook_build", **stage})
        if stage["returncode"] != 0:
            manifest["status"] = "failed"
            manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
            write_manifest(manifest_path, manifest)
            print(stage["stdout"])
            print(stage["stderr"], file=sys.stderr)
            print(manifest_path)
            return int(stage["returncode"])

    if not args.skip_workbook_validate and output_path.exists():
        stage = run_command([sys.executable, str(WORKBOOK_VALIDATOR), str(output_path)], REPO_ROOT)
        manifest["stages"].append({"name": "workbook_validation", **stage})
        if stage["returncode"] != 0:
            manifest["status"] = "failed"
            manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
            write_manifest(manifest_path, manifest)
            print(stage["stdout"])
            print(stage["stderr"], file=sys.stderr)
            print(manifest_path)
            return int(stage["returncode"])

    manifest["status"] = "passed"
    manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
    write_manifest(manifest_path, manifest)
    print(f"Pipeline passed: {output_path}")
    print(f"Manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
