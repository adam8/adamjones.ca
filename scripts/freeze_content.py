#!/usr/bin/env python3
"""Run snapshot updaters in a fixed order and print an auditable summary."""

from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "public" / "index.html"

FOCUS_START = "<!-- FOCUS_CARDS_SNAPSHOT_START -->"
FOCUS_END = "<!-- FOCUS_CARDS_SNAPSHOT_END -->"
TODO_START = "<!-- TODO_SNAPSHOT_START -->"
TODO_END = "<!-- TODO_SNAPSHOT_END -->"
HOLIDAYS_START = "<!-- UPCOMING_HOLIDAYS_START -->"
HOLIDAYS_END = "<!-- UPCOMING_HOLIDAYS_END -->"


@dataclass(frozen=True)
class FreezeTask:
    name: str
    command: list[str]
    start_marker: str
    end_marker: str
    item_pattern: re.Pattern[str]


TASKS: tuple[FreezeTask, ...] = (
    FreezeTask(
        name="focus-cards",
        command=[sys.executable, str(ROOT / "scripts" / "update_focus_cards_snapshot.py")],
        start_marker=FOCUS_START,
        end_marker=FOCUS_END,
        item_pattern=re.compile(r"<button\b[^>]*\bclass=\"[^\"]*\bfocus-card\b"),
    ),
    FreezeTask(
        name="todos",
        command=[sys.executable, str(ROOT / "scripts" / "update_todo_snapshot.py")],
        start_marker=TODO_START,
        end_marker=TODO_END,
        item_pattern=re.compile(r"<li\b[^>]*\bclass=\"[^\"]*\btodo-item\b"),
    ),
    FreezeTask(
        name="holidays",
        command=[sys.executable, str(ROOT / "scripts" / "update_upcoming_holidays.py")],
        start_marker=HOLIDAYS_START,
        end_marker=HOLIDAYS_END,
        item_pattern=re.compile(r"<li\b[^>]*\bclass=\"[^\"]*\bholiday-row\b"),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Freeze dashboard content snapshots.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Forward --strict to scripts that support it (focus cards and todos).",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_block(html: str, start_marker: str, end_marker: str) -> str:
    start = html.find(start_marker)
    end = html.find(end_marker)
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f"Could not find valid marker pair: {start_marker} ... {end_marker}")

    content_start = start + len(start_marker)
    return html[content_start:end]


def count_items(index_path: Path, start_marker: str, end_marker: str, pattern: re.Pattern[str]) -> int:
    html = index_path.read_text(encoding="utf-8")
    block = extract_block(html, start_marker, end_marker)
    return len(pattern.findall(block))


def maybe_add_strict_flag(command: list[str], strict: bool) -> list[str]:
    if not strict:
        return command

    script_name = Path(command[-1]).name
    if script_name in {"update_focus_cards_snapshot.py", "update_todo_snapshot.py"}:
        return [*command, "--strict"]

    return command


def run_task(task: FreezeTask, strict: bool) -> tuple[str, int, bool, str, int]:
    before_hash = sha256(INDEX_PATH)
    command = maybe_add_strict_flag(task.command, strict)

    completed = subprocess.run(
        command,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )

    after_hash = sha256(INDEX_PATH)
    changed = before_hash != after_hash
    items = count_items(INDEX_PATH, task.start_marker, task.end_marker, task.item_pattern)

    combined_output = "\n".join(
        line.strip()
        for line in [completed.stdout.strip(), completed.stderr.strip()]
        if line.strip()
    )

    return task.name, items, changed, combined_output, completed.returncode


def main() -> int:
    args = parse_args()

    print("Running content freeze workflow:")
    failures = 0

    for task in TASKS:
        name, items, changed, output, returncode = run_task(task, strict=args.strict)
        status = "ok" if returncode == 0 else "failed"
        change_text = "changed" if changed else "no-change"
        print(f"- {name}: status={status} items={items} {change_text}")

        if output:
            first_line = output.splitlines()[0]
            print(f"  note: {first_line}")

        if returncode != 0:
            failures += 1

    if failures:
        print(f"Content freeze completed with {failures} failed task(s).", file=sys.stderr)
        return 1

    print("Content freeze completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
