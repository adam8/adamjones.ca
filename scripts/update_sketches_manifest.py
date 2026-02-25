#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public" / "data" / "sketch.json"
DEFAULT_INPUT = ROOT / "data" / "sketches" / "sketches-snapshot.json"
DEFAULT_API_URL = "https://api.adamjones.ca/sketches?limit=200"

MAX_NOTE_LENGTH = 280


def _parse_iso_datetime(value: str) -> dt.datetime | None:
  if not isinstance(value, str):
    return None
  text = value.strip()
  if not text:
    return None
  if text.endswith("Z"):
    text = text[:-1] + "+00:00"
  try:
    parsed = dt.datetime.fromisoformat(text)
  except ValueError:
    return None
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=dt.timezone.utc)
  return parsed.astimezone(dt.timezone.utc)


def _is_valid_http_url(value: str) -> bool:
  try:
    parsed = urlparse(value)
  except ValueError:
    return False
  return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _normalize_items(items: list[dict], limit: int) -> list[dict]:
  normalized: list[tuple[dt.datetime, dict]] = []
  for raw in items:
    if not isinstance(raw, dict):
      continue

    item_id = str(raw.get("id") or "").strip()
    if not item_id:
      continue

    sketch_at_dt = _parse_iso_datetime(str(raw.get("sketch_at") or ""))
    if not sketch_at_dt:
      continue

    image_url = str(raw.get("image_url") or "").strip()
    if not image_url or not _is_valid_http_url(image_url):
      continue

    note = str(raw.get("note") or "").strip()[:MAX_NOTE_LENGTH]

    normalized.append(
      (
        sketch_at_dt,
        {
          "id": item_id,
          "sketch_at": sketch_at_dt.isoformat().replace("+00:00", "Z"),
          "image_url": image_url,
          "note": note,
        },
      )
    )

  normalized.sort(key=lambda item: item[0], reverse=True)
  return [item for _, item in normalized[:limit]]


def _load_from_file(path: Path, limit: int) -> list[dict]:
  payload = json.loads(path.read_text(encoding="utf-8"))
  if isinstance(payload, dict):
    items = payload.get("data") or payload.get("items") or []
  elif isinstance(payload, list):
    items = payload
  else:
    items = []
  return _normalize_items(items, limit)


def _load_from_api(
  api_url: str,
  timeout: float,
  limit: int,
  ssl_context: ssl.SSLContext,
) -> list[dict]:
  headers = {"accept": "application/json"}
  client_id = os.getenv("CF_ACCESS_CLIENT_ID")
  client_secret = os.getenv("CF_ACCESS_CLIENT_SECRET")
  if client_id and client_secret:
    headers["CF-Access-Client-Id"] = client_id
    headers["CF-Access-Client-Secret"] = client_secret

  req = urllib.request.Request(api_url, headers=headers, method="GET")
  with urllib.request.urlopen(req, timeout=timeout, context=ssl_context) as resp:
    body = resp.read().decode("utf-8")

  payload = json.loads(body)
  items = payload.get("data") or payload.get("items") or []
  return _normalize_items(items, limit)


def _load_items(
  source: str,
  input_path: Path,
  api_url: str,
  timeout: float,
  limit: int,
  ssl_context: ssl.SSLContext,
) -> tuple[list[dict], str]:
  if source == "file":
    if not input_path.exists():
      raise SystemExit(f"Missing input snapshot file: {input_path}")
    return _load_from_file(input_path, limit), "file"

  if source == "api":
    return _load_from_api(api_url, timeout, limit, ssl_context), "api"

  # auto mode: local file first, then API.
  if input_path.exists():
    return _load_from_file(input_path, limit), "file"
  return _load_from_api(api_url, timeout, limit, ssl_context), "api"


def _build_ssl_context(cafile: Path | None, insecure: bool) -> ssl.SSLContext:
  if insecure:
    return ssl._create_unverified_context()
  if cafile:
    if not cafile.exists():
      raise SystemExit(f"--cafile does not exist: {cafile}")
    if not cafile.is_file():
      raise SystemExit(f"--cafile must point to a file: {cafile}")
    return ssl.create_default_context(cafile=str(cafile))
  return ssl.create_default_context()


def _truncate(text: str, max_chars: int = 260) -> str:
  if len(text) <= max_chars:
    return text
  return text[: max_chars - 1] + "…"


def _format_http_error(exc: urllib.error.HTTPError, api_url: str) -> str:
  lines = [
    f"Failed to fetch sketches from API: {api_url}",
    f"HTTP {exc.code} {exc.reason}.",
  ]
  if exc.code in {401, 403}:
    lines.append(
      "This usually means Cloudflare Access auth is missing/invalid. "
      "Set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET in your shell."
    )
  try:
    body = exc.read().decode("utf-8", errors="replace").strip()
  except Exception:
    body = ""
  if body:
    lines.append(f"Response snippet: {_truncate(body)}")
  return "\n".join(lines)


def _format_url_error(
  exc: urllib.error.URLError,
  api_url: str,
  cafile: Path | None,
  insecure: bool,
) -> str:
  reason = exc.reason
  reason_text = str(reason).strip() or str(exc)
  lines = [f"Failed to fetch sketches from API: {api_url}"]

  ssl_verification_failed = (
    isinstance(reason, ssl.SSLCertVerificationError)
    or "CERTIFICATE_VERIFY_FAILED" in reason_text
  )
  if ssl_verification_failed:
    lines.append(
      "TLS certificate verification failed in local Python trust settings."
    )
    lines.append(
      "Fix (macOS python.org build): run "
      "/Applications/Python\\ 3.13/Install\\ Certificates.command"
    )
    if cafile:
      lines.append(
        f"Current --cafile was: {cafile}. Verify it contains the right root CAs."
      )
    else:
      lines.append(
        "Or pass --cafile /path/to/ca-bundle.pem to use a specific CA bundle."
      )
    if not insecure:
      lines.append(
        "Temporary diagnostic only: rerun with --insecure (not recommended for regular use)."
      )
    lines.append(f"Underlying SSL error: {reason_text}")
    return "\n".join(lines)

  if isinstance(reason, TimeoutError):
    lines.append("Network timeout while requesting sketches API.")
  else:
    lines.append(f"Network error: {reason_text}")
  lines.append("Check network connectivity, DNS, and API URL accessibility.")
  return "\n".join(lines)


def _format_json_error(exc: json.JSONDecodeError, source: str, api_url: str) -> str:
  lines = [
    "Failed to parse JSON while generating sketch manifest.",
    f"{exc.msg} (line {exc.lineno}, column {exc.colno}).",
  ]
  if source == "api":
    lines.append(
      f"Source was API: {api_url}. If auth failed, the response may be HTML/error text."
    )
  return "\n".join(lines)


def _handle_load_failure(best_effort: bool, message: str) -> int:
  if best_effort:
    print(f"sketch manifest unchanged (best-effort):\n{message}", file=sys.stderr)
    return 0
  raise SystemExit(message)


def main() -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
  parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
  parser.add_argument("--api-url", default=DEFAULT_API_URL)
  parser.add_argument("--source", choices=["auto", "file", "api"], default="api")
  parser.add_argument("--timeout", type=float, default=6.0)
  parser.add_argument("--limit", type=int, default=200)
  parser.add_argument(
    "--cafile",
    type=Path,
    default=None,
    help="Path to a PEM CA bundle to use for TLS verification (API mode).",
  )
  parser.add_argument(
    "--insecure",
    action="store_true",
    help="Disable TLS certificate verification (API mode, diagnostic use only).",
  )
  parser.add_argument(
    "--best-effort",
    action="store_true",
    help="On load failure, keep existing manifest and exit 0.",
  )
  args = parser.parse_args()

  if args.limit < 1:
    raise SystemExit("--limit must be >= 1")
  if args.cafile and args.insecure:
    raise SystemExit("Use either --cafile or --insecure, not both.")

  ssl_context = _build_ssl_context(args.cafile, args.insecure)

  try:
    items, source = _load_items(
      args.source,
      args.input,
      args.api_url,
      args.timeout,
      args.limit,
      ssl_context,
    )
  except urllib.error.HTTPError as exc:
    return _handle_load_failure(args.best_effort, _format_http_error(exc, args.api_url))
  except urllib.error.URLError as exc:
    return _handle_load_failure(
      args.best_effort,
      _format_url_error(exc, args.api_url, args.cafile, args.insecure),
    )
  except TimeoutError:
    return _handle_load_failure(
      args.best_effort,
      "Timed out while fetching sketch data.",
    )
  except json.JSONDecodeError as exc:
    return _handle_load_failure(
      args.best_effort,
      _format_json_error(exc, args.source, args.api_url),
    )

  payload = {
    "version": 1,
    "generated_at": dt.datetime.now(dt.timezone.utc)
    .isoformat(timespec="seconds")
    .replace("+00:00", "Z"),
    "items": items,
  }

  args.output.parent.mkdir(parents=True, exist_ok=True)
  args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
  print(f"updated sketches manifest from {source} with {len(items)} item(s)")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
