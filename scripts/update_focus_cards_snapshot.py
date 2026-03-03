#!/usr/bin/env python3
"""Refresh FOCUS_CARDS_SNAPSHOT block in public/index.html from api.adamjones.ca."""

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

START_MARKER = "<!-- FOCUS_CARDS_SNAPSHOT_START -->"
END_MARKER = "<!-- FOCUS_CARDS_SNAPSHOT_END -->"
SLOT_ORDER = ("primary-focus", "current-mode")
USER_AGENT = "adamjones.ca-focus-cards-refresh/1.0"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update focus-card fallback snapshot in public/index.html."
    )
    parser.add_argument(
        "--api-url",
        default="https://api.adamjones.ca/focus-cards",
        help="Focus-cards API URL.",
    )
    parser.add_argument(
        "--index-path",
        default="public/index.html",
        help="Path to the HTML file containing focus-card snapshot markers.",
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


def fetch_cards(
    api_url: str, timeout: float, ssl_context: ssl.SSLContext
) -> list[dict[str, object]]:
    request = urllib.request.Request(api_url, headers=build_headers(), method="GET")
    with urllib.request.urlopen(request, timeout=timeout, context=ssl_context) as response:
        body = response.read().decode("utf-8")
        payload = json.loads(body)
    data = payload.get("data", []) if isinstance(payload, dict) else payload
    if not isinstance(data, list):
        raise ValueError("Expected focus-cards data array.")
    return data


def build_snapshot(items: list[dict[str, object]]) -> str:
    cards_by_slot = {
        str(item.get("slot", "")).strip(): item
        for item in items
        if str(item.get("slot", "")).strip()
    }

    parts: list[str] = []
    for slot in SLOT_ORDER:
        item = cards_by_slot.get(slot)
        if not item:
            continue
        label = html.escape(normalize_text(item.get("label")))
        front = html.escape(normalize_text(item.get("front")))
        back = html.escape(normalize_text(item.get("back")))
        if not label or not front or not back:
            continue
        parts.append(build_card(slot=slot, label=label, front=front, back=back))

    if not parts:
        raise ValueError("No valid focus cards returned from API.")
    if len(parts) != len(SLOT_ORDER):
        raise ValueError("Focus-card API response is missing one or more required slots.")

    return "\n".join(parts)


def build_card(*, slot: str, label: str, front: str, back: str) -> str:
    return f"""              <button class="focus-card" type="button" data-focus-card data-focus-slot="{slot}" aria-pressed="false">
                <span class="focus-card-inner">
                  <span class="focus-card-face focus-card-front" data-focus-face="front">
                    <span class="focus-label" data-focus-label>{label}</span>
                    <span class="focus-copy" data-focus-copy>{front}</span>
                    <span class="focus-hint" aria-hidden="true">Tap to reveal answer</span>
                  </span>
                  <span class="focus-card-face focus-card-back" data-focus-face="back" aria-hidden="true">
                    <span class="focus-label" data-focus-label>{label}</span>
                    <span class="focus-copy" data-focus-copy>{back}</span>
                    <span class="focus-hint" aria-hidden="true">Tap to flip back</span>
                  </span>
                </span>
              </button>"""


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def update_html(index_path: Path, items: list[dict[str, object]]) -> bool:
    content = index_path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"({re.escape(START_MARKER)}\n)(.*?)(\n\s*{re.escape(END_MARKER)})",
        re.DOTALL,
    )
    snapshot = build_snapshot(items)
    replaced, count = pattern.subn(rf"\1{snapshot}\3", content, count=1)
    if count != 1:
        raise ValueError("Could not find focus-card snapshot markers in index.html.")
    if replaced == content:
        return False
    index_path.write_text(replaced, encoding="utf-8")
    return True


def main() -> int:
    args = parse_args()
    index_path = Path(args.index_path)
    try:
        ssl_context = create_ssl_context(args.ca_bundle)
        items = fetch_cards(args.api_url, args.timeout, ssl_context)
        changed = update_html(index_path, items)
        print(f"Updated focus-card snapshot with {len(items)} item(s). changed={str(changed).lower()}")
        return 0
    except urllib.error.HTTPError as exc:
        cf_ray = exc.headers.get("cf-ray", "")
        location = exc.headers.get("location", "")
        server = exc.headers.get("server", "")
        has_cf_id = bool(os.getenv("CF_ACCESS_CLIENT_ID"))
        has_cf_secret = bool(os.getenv("CF_ACCESS_CLIENT_SECRET"))
        has_bearer = bool(os.getenv("TODOS_API_BEARER_TOKEN"))
        message = (
            "Focus-card snapshot refresh skipped: "
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
        message = f"Focus-card snapshot refresh skipped: {exc}"
        if args.strict:
            print(message, file=sys.stderr)
            return 1
        print(message)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
