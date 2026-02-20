#!/usr/bin/env python3
"""Refresh TODO_SNAPSHOT block in public/index.html from api.adamjones.ca/todos."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

START_MARKER = "<!-- TODO_SNAPSHOT_START -->"
END_MARKER = "<!-- TODO_SNAPSHOT_END -->"
USER_AGENT = "adamjones.ca-daily-journal-refresh/1.0"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update TODO fallback snapshot in public/index.html."
    )
    parser.add_argument(
        "--api-url",
        default="https://api.adamjones.ca/todos",
        help="Todos API URL.",
    )
    parser.add_argument(
        "--index-path",
        default="public/index.html",
        help="Path to the HTML file containing TODO snapshot markers.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=8.0,
        help="HTTP timeout in seconds.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if API fetch or update fails.",
    )
    parser.add_argument(
        "--ca-bundle",
        default=None,
        help=(
            "Path to CA bundle for TLS verification. "
            "If omitted, uses SSL_CERT_FILE, then certifi, then system defaults."
        ),
    )
    return parser.parse_args()


def build_headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    bearer = os.getenv("TODOS_API_BEARER_TOKEN")
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    cf_id = os.getenv("CF_ACCESS_CLIENT_ID")
    cf_secret = os.getenv("CF_ACCESS_CLIENT_SECRET")
    if cf_id and cf_secret:
        headers["CF-Access-Client-Id"] = cf_id
        headers["CF-Access-Client-Secret"] = cf_secret
    return headers


def resolve_ca_bundle(explicit_ca_bundle: str | None) -> str | None:
    if explicit_ca_bundle:
        return explicit_ca_bundle
    env_ca_bundle = os.getenv("SSL_CERT_FILE")
    if env_ca_bundle:
        return env_ca_bundle
    try:
        import certifi  # type: ignore

        return certifi.where()
    except Exception:
        return None


def create_ssl_context(explicit_ca_bundle: str | None) -> ssl.SSLContext:
    ca_bundle = resolve_ca_bundle(explicit_ca_bundle)
    if ca_bundle:
        return ssl.create_default_context(cafile=ca_bundle)
    return ssl.create_default_context()


def fetch_items(
    api_url: str, timeout: float, ssl_context: ssl.SSLContext
) -> list[dict[str, object]]:
    request = urllib.request.Request(api_url, headers=build_headers(), method="GET")
    with urllib.request.urlopen(request, timeout=timeout, context=ssl_context) as response:
        body = response.read().decode("utf-8")
        payload = json.loads(body)
    if isinstance(payload, dict):
        data = payload.get("data", [])
    elif isinstance(payload, list):
        data = payload
    else:
        raise ValueError("Unsupported JSON shape from todos API.")
    if not isinstance(data, list):
        raise ValueError("Expected todos data array.")
    return data


def build_snapshot(items: list[dict[str, object]]) -> str:
    if not items:
        return """                <li class="todo-item" data-id="snapshot-empty">
                  <label class="todo-label">
                    <input type="checkbox" />
                    <span>No active tasks right now.</span>
                  </label>
                  <button type="button" class="todo-delete" data-todo-delete="true">Delete</button>
                </li>"""

    parts: list[str] = []
    for index, item in enumerate(items, start=1):
        text = html.escape(str(item.get("text", "")).strip() or f"Untitled task {index}")
        item_id = html.escape(str(item.get("id", f"snapshot-{index}")))
        checked = " checked" if bool(item.get("completed", False)) else ""
        parts.append(
            f"""                <li class="todo-item" data-id="{item_id}">
                  <label class="todo-label">
                    <input type="checkbox"{checked} />
                    <span>{text}</span>
                  </label>
                  <button type="button" class="todo-delete" data-todo-delete="true">Delete</button>
                </li>"""
        )
    return "\n".join(parts)


def update_html(index_path: Path, items: list[dict[str, object]]) -> bool:
    content = index_path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"({re.escape(START_MARKER)}\n)(.*?)(\n\s*{re.escape(END_MARKER)})",
        re.DOTALL,
    )
    snapshot = build_snapshot(items)
    replaced, count = pattern.subn(rf"\1{snapshot}\3", content, count=1)
    if count != 1:
        raise ValueError("Could not find TODO snapshot markers in index.html.")
    if replaced == content:
        return False
    index_path.write_text(replaced, encoding="utf-8")
    return True


def main() -> int:
    args = parse_args()
    index_path = Path(args.index_path)
    try:
        ssl_context = create_ssl_context(args.ca_bundle)
        items = fetch_items(args.api_url, args.timeout, ssl_context)
        changed = update_html(index_path, items)
        print(f"Updated todo snapshot with {len(items)} item(s). changed={str(changed).lower()}")
        return 0
    except urllib.error.HTTPError as exc:
        cf_ray = exc.headers.get("cf-ray", "")
        location = exc.headers.get("location", "")
        server = exc.headers.get("server", "")
        has_cf_id = bool(os.getenv("CF_ACCESS_CLIENT_ID"))
        has_cf_secret = bool(os.getenv("CF_ACCESS_CLIENT_SECRET"))
        has_bearer = bool(os.getenv("TODOS_API_BEARER_TOKEN"))
        message = (
            "Todo snapshot refresh skipped: "
            f"HTTP {exc.code} "
            f"(server={server or 'unknown'} cf_ray={cf_ray or 'n/a'} "
            f"location={location or 'n/a'} has_cf_id={has_cf_id} "
            f"has_cf_secret={has_cf_secret} has_bearer={has_bearer})"
        )
        if args.strict:
            print(message, file=sys.stderr)
            return 1
        print(message)
        return 0
    except (urllib.error.URLError, json.JSONDecodeError, ValueError) as exc:
        message = f"Todo snapshot refresh skipped: {exc}"
        if args.strict:
            print(message, file=sys.stderr)
            return 1
        print(message)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
