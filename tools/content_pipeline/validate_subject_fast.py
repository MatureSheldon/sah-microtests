#!/usr/bin/env python3
"""Fast SAH subject workbook validation without XLSX build/rendering."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = REPO_ROOT / "tools" / "content_pipeline" / "validate_subject_workbook.py"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run only CSV/content validation for fast chapter iteration.")
    parser.add_argument("--source-dir", type=Path, required=True, help="Folder containing subject workbook CSV files.")
    parser.add_argument("--report", type=Path, help="Optional validation report path.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on warnings as well as errors.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    command = [sys.executable, str(VALIDATOR), "--source-dir", str(args.source_dir.expanduser().resolve())]
    if args.report:
        command += ["--report", str(args.report.expanduser().resolve())]
    if args.strict:
        command.append("--strict")
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
