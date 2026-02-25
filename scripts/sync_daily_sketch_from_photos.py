#!/usr/bin/env python3
import argparse
import datetime as dt
import hashlib
import json
import mimetypes
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_API_BASE = "https://api.adamjones.ca"
DEFAULT_MANIFEST = ROOT / "public" / "data" / "sketch.json"
DEFAULT_ALBUM_NAME = "Daily Sketch"
DEFAULT_FETCH_LIMIT = 200

ALLOWED_MIME_TYPES = {
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
}

EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
}

MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}


def run_command(
  args: list[str],
  *,
  cwd: Path | None = None,
  check: bool = True,
) -> subprocess.CompletedProcess[str]:
  result = subprocess.run(
    args,
    cwd=str(cwd) if cwd else None,
    capture_output=True,
    text=True,
  )
  if check and result.returncode != 0:
    stderr = result.stderr.strip() or "(no stderr)"
    stdout = result.stdout.strip()
    details = f"\nstdout: {stdout}" if stdout else ""
    raise RuntimeError(f"Command failed ({' '.join(args)}): {stderr}{details}")
  return result


def parse_iso_utc(value: str) -> dt.datetime:
  text = value.strip()
  if text.endswith("Z"):
    text = text[:-1] + "+00:00"
  parsed = dt.datetime.fromisoformat(text)
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=dt.timezone.utc)
  return parsed.astimezone(dt.timezone.utc)


def sanitize_slug(value: str) -> str:
  stem = value.strip().lower()
  stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
  if not stem:
    return "sketch"
  return stem[:48]


def short_sha256(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as f:
    for chunk in iter(lambda: f.read(65536), b""):
      digest.update(chunk)
  return digest.hexdigest()[:10]


def detect_content_type(path: Path) -> str:
  ext_mime = EXTENSION_TO_MIME.get(path.suffix.lower())
  if ext_mime:
    return ext_mime
  guessed, _ = mimetypes.guess_type(path.name)
  if guessed:
    return guessed.lower()
  return ""


def pick_exported_file(export_dir: Path, preferred_filename: str) -> Path:
  files = [p for p in export_dir.iterdir() if p.is_file()]
  if not files:
    raise RuntimeError("Photos export succeeded but no file was written.")

  preferred_path = export_dir / preferred_filename
  if preferred_filename and preferred_path.exists() and preferred_path.is_file():
    return preferred_path

  # In case Photos adjusted file naming (e.g. duplicates), pick most recently modified.
  return max(files, key=lambda p: p.stat().st_mtime)


def build_object_key(sketch_at: dt.datetime, exported_file: Path, content_type: str) -> str:
  year = f"{sketch_at.year:04d}"
  month = f"{sketch_at.month:02d}"
  day = f"{sketch_at.day:02d}"
  hh = f"{sketch_at.hour:02d}"
  mm = f"{sketch_at.minute:02d}"
  ss = f"{sketch_at.second:02d}"

  ext = MIME_TO_EXTENSION.get(content_type)
  if not ext:
    ext = exported_file.suffix.lower().lstrip(".") or "img"

  slug = sanitize_slug(exported_file.stem)
  file_hash = short_sha256(exported_file)
  return (
    f"sketches/{year}/{month}/"
    f"{year}-{month}-{day}-{hh}{mm}{ss}-{slug}-{file_hash}.{ext}"
  )


def parse_json_output(value: str) -> dict:
  text = value.strip()
  if not text:
    raise RuntimeError("Command returned empty output; expected JSON.")

  # Handle cases where tools emit extra lines before JSON.
  lines = [line.strip() for line in text.splitlines() if line.strip()]
  candidate = lines[-1] if lines else text
  try:
    parsed = json.loads(candidate)
  except json.JSONDecodeError as exc:
    raise RuntimeError(f"Failed to parse JSON output: {exc}") from exc
  if not isinstance(parsed, dict):
    raise RuntimeError("Expected a JSON object.")
  return parsed


def fetch_sketches_snapshot(
  api_base: str,
  client_id: str,
  client_secret: str,
  limit: int,
  output_file: Path,
) -> None:
  api_url = f"{api_base.rstrip('/')}/sketches?limit={limit}"
  cmd = [
    "curl",
    "-sS",
    api_url,
    "-H",
    f"CF-Access-Client-Id: {client_id}",
    "-H",
    f"CF-Access-Client-Secret: {client_secret}",
    "-o",
    str(output_file),
    "-w",
    "%{http_code}",
  ]
  result = run_command(cmd)
  status = result.stdout.strip()
  if status != "200":
    body = output_file.read_text(encoding="utf-8", errors="replace")[:400]
    raise RuntimeError(f"Failed to fetch sketches snapshot (HTTP {status}): {body}")


def upload_sketch(
  api_base: str,
  client_id: str,
  client_secret: str,
  exported_file: Path,
  sketch_at_iso: str,
  content_type: str,
  object_key: str,
  note: str,
) -> tuple[int, dict]:
  with tempfile.NamedTemporaryFile(prefix="sketch-upload-", suffix=".json", delete=False) as f:
    body_path = Path(f.name)

  try:
    cmd = [
      "curl",
      "-sS",
      "-X",
      "POST",
      f"{api_base.rstrip('/')}/sketches/upload",
      "-H",
      f"CF-Access-Client-Id: {client_id}",
      "-H",
      f"CF-Access-Client-Secret: {client_secret}",
      "-F",
      f"file=@{exported_file};type={content_type}",
      "-F",
      f"sketch_at={sketch_at_iso}",
      "-F",
      f"note={note}",
      "-F",
      f"object_key={object_key}",
      "-o",
      str(body_path),
      "-w",
      "%{http_code}",
    ]
    result = run_command(cmd)
    status_text = result.stdout.strip()
    try:
      status = int(status_text)
    except ValueError as exc:
      raise RuntimeError(f"Unexpected curl status output: {status_text}") from exc

    body_text = body_path.read_text(encoding="utf-8", errors="replace")
    try:
      payload = json.loads(body_text)
    except json.JSONDecodeError:
      payload = {"raw": body_text}
    return status, payload
  finally:
    try:
      body_path.unlink(missing_ok=True)
    except Exception:
      pass


def refresh_manifest_from_snapshot(snapshot_file: Path, manifest_path: Path) -> None:
  run_command(
    [
      "python3",
      str(ROOT / "scripts" / "update_sketches_manifest.py"),
      "--source",
      "file",
      "--input",
      str(snapshot_file),
      "--output",
      str(manifest_path),
    ],
    cwd=ROOT,
  )


def sync_daily_sketch(
  *,
  album_name: str,
  api_base: str,
  manifest_path: Path,
  limit: int,
  note: str,
) -> int:
  client_id = os.getenv("CF_ACCESS_CLIENT_ID", "").strip()
  client_secret = os.getenv("CF_ACCESS_CLIENT_SECRET", "").strip()
  if not client_id or not client_secret:
    raise RuntimeError(
      "CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required in environment."
    )

  export_script = ROOT / "scripts" / "export_latest_photo_from_album.applescript"
  if not export_script.exists():
    raise RuntimeError(f"Missing script: {export_script}")

  with tempfile.TemporaryDirectory(prefix="daily-sketch-export-") as tmp:
    export_dir = Path(tmp)
    export_result = run_command(
      [
        "osascript",
        str(export_script),
        album_name,
        str(export_dir),
      ]
    )
    metadata = parse_json_output(export_result.stdout)

    if not metadata.get("ok"):
      reason = str(metadata.get("reason") or "unknown")
      if reason == "empty":
        print(f'No items in Photos album "{album_name}".')
        return 0
      raise RuntimeError(f"Photos export did not return success: {metadata}")

    preferred_filename = str(metadata.get("filename") or "")
    sketch_at_text = str(metadata.get("sketch_at") or "").strip()
    if not sketch_at_text:
      raise RuntimeError("Missing sketch_at in Photos export metadata.")

    sketch_at = parse_iso_utc(sketch_at_text)
    sketch_at_iso = sketch_at.isoformat(timespec="seconds").replace("+00:00", "Z")

    exported_file = pick_exported_file(export_dir, preferred_filename)
    content_type = detect_content_type(exported_file)
    if content_type not in ALLOWED_MIME_TYPES:
      raise RuntimeError(
        f"Unsupported exported file type: {exported_file.name} ({content_type or 'unknown'})"
      )

    object_key = build_object_key(sketch_at, exported_file, content_type)
    status, payload = upload_sketch(
      api_base=api_base,
      client_id=client_id,
      client_secret=client_secret,
      exported_file=exported_file,
      sketch_at_iso=sketch_at_iso,
      content_type=content_type,
      object_key=object_key,
      note=note.strip(),
    )

    if status == 201:
      created = payload.get("data") if isinstance(payload, dict) else {}
      print(
        "Uploaded sketch:",
        created.get("id"),
        created.get("sketch_at"),
        created.get("image_url"),
      )
    elif status == 409:
      print(f"Sketch already uploaded for object key: {object_key}")
    else:
      raise RuntimeError(f"Upload failed (HTTP {status}): {json.dumps(payload)}")

    snapshot_file = export_dir / "sketches-api.json"
    fetch_sketches_snapshot(api_base, client_id, client_secret, limit, snapshot_file)
    refresh_manifest_from_snapshot(snapshot_file, manifest_path)
    print(f"Updated sketch manifest: {manifest_path}")
    return 0


def main() -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--album-name", default=DEFAULT_ALBUM_NAME)
  parser.add_argument("--api-base", default=DEFAULT_API_BASE)
  parser.add_argument("--manifest-path", type=Path, default=DEFAULT_MANIFEST)
  parser.add_argument("--limit", type=int, default=DEFAULT_FETCH_LIMIT)
  parser.add_argument("--note", default="")
  parser.add_argument(
    "--best-effort",
    action="store_true",
    help="On any failure, print warning and exit 0.",
  )
  args = parser.parse_args()

  if args.limit < 1:
    raise SystemExit("--limit must be >= 1")

  try:
    return sync_daily_sketch(
      album_name=args.album_name.strip(),
      api_base=args.api_base.strip(),
      manifest_path=args.manifest_path,
      limit=args.limit,
      note=args.note,
    )
  except Exception as exc:
    if args.best_effort:
      print(f"daily sketch sync skipped (best-effort): {exc}", file=sys.stderr)
      return 0
    raise


if __name__ == "__main__":
  raise SystemExit(main())
