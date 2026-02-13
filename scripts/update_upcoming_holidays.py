#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import json
from pathlib import Path
import re
import calendar as calmod


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INDEX = ROOT / "public" / "index.html"
DEFAULT_INPUT = ROOT / "data" / "calendar" / "canadian-holidays.json"

START_MARK = "<!-- UPCOMING_HOLIDAYS_START -->"
END_MARK = "<!-- UPCOMING_HOLIDAYS_END -->"

_REGION_TAGS = {
    "AB",
    "BC",
    "MB",
    "NB",
    "NL",
    "NS",
    "NT",
    "NU",
    "ON",
    "PE",
    "QC",
    "SK",
    "YT",
    # Common alternates that might appear in parentheses.
    "NWT",
    "PEI",
}


def _parse_iso_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def _parse_iso_datetime_utc(s: str) -> dt.datetime:
    # Exporter uses Z suffix.
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return dt.datetime.fromisoformat(s)


def _format_day(d: dt.date, include_year: bool) -> str:
    # Example: Tue, Apr 6 or Tue, Apr 6, 2027
    try:
        base = d.strftime("%a, %b %-d")  # macOS
    except ValueError:
        base = d.strftime("%a, %b %d").replace(" 0", " ")
    if include_year:
        return f"{base}, {d.year}"
    return base


def _render(events: list[dict], today: dt.date, horizon_days: int, limit: int) -> str:
    end = today + dt.timedelta(days=horizon_days)
    items: list[tuple[dt.date, str]] = []
    seen: set[tuple[dt.date, str]] = set()

    for e in events:
        title = str(e.get("title") or "").strip()
        if not title:
            continue
        if not _include_title_for_bc(title):
            continue

        if e.get("recurrence"):
            base_day = (
                _parse_iso_date(e["date"])
                if e.get("allDay") and e.get("date")
                else _parse_iso_datetime_utc(e["start"]).date()
            )
            for day in _expand_recurrence_dates(str(e["recurrence"]), base_day, today, end):
                key = (day, title)
                if key in seen:
                    continue
                seen.add(key)
                items.append((day, title))
        else:
            if e.get("allDay") and e.get("date"):
                day = _parse_iso_date(e["date"])
            else:
                day = _parse_iso_datetime_utc(e["start"]).date()

            if day < today or day > end:
                continue
            key = (day, title)
            if key in seen:
                continue
            seen.add(key)
            items.append((day, title))

    items.sort(key=lambda x: (x[0], x[1].lower()))
    items = items[:limit]

    if not items:
        return f'<p class="muted">No holidays in the next {horizon_days} days.</p>'

    cal_html = _render_month_calendar(items, today=today)

    parts = [cal_html, '<ul class="holidays">']
    for day, title in items:
        include_year = day.year != today.year
        day_label = html.escape(_format_day(day, include_year))
        title_label = html.escape(_display_holiday_title(title))
        parts.append('  <li class="holiday-row">')
        parts.append(f'    <span class="holiday-date">{day_label}</span>')
        parts.append(f'    <span class="holiday-title">{title_label}</span>')
        parts.append("  </li>")
    parts.append("</ul>")
    return "\n".join(parts)


def _display_holiday_title(title: str) -> str:
    # Strip trailing region abbreviations, e.g. "Family Day (AB, BC)" -> "Family Day".
    return re.sub(r"\s*\((?:[A-Z]{2,3}(?:,\s*[A-Z]{2,3})*)\)\s*$", "", title).strip()


def _include_title_for_bc(title: str) -> bool:
    """
    Exclude region-specific holidays not for BC.

    - No parentheses: include.
    - Parentheses but no known region tag: include (e.g. "(Observed)").
    - Known region tag(s) present: include only if BC is among them.
    """
    groups = re.findall(r"\(([^)]*)\)", title)
    if not groups:
        return True

    found_tags: set[str] = set()
    for g in groups:
        # Handle dotted abbreviations like "B.C." / "N.W.T." by stripping dots.
        g_norm = g.upper().replace(".", "")
        for tok in re.findall(r"\b[A-Z]{2,3}\b", g_norm):
            if tok in _REGION_TAGS:
                found_tags.add(tok)

    if not found_tags:
        return True
    return "BC" in found_tags


def _parse_rrule(rrule: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in rrule.split(";"):
        if not part.strip():
            continue
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        out[k.strip().upper()] = v.strip()
    return out


def _nth_weekday_of_month(year: int, month: int, weekday: int, nth: int) -> dt.date:
    """
    weekday: Monday=0..Sunday=6
    nth: 1..5 or -1..-5 (e.g. -1 is last)
    """
    _, last_day = calmod.monthrange(year, month)
    if nth > 0:
        first = dt.date(year, month, 1)
        offset = (weekday - first.weekday()) % 7
        day = 1 + offset + 7 * (nth - 1)
        if day > last_day:
            raise ValueError("nth weekday out of range")
        return dt.date(year, month, day)
    else:
        last = dt.date(year, month, last_day)
        offset = (last.weekday() - weekday) % 7
        day = last_day - offset - 7 * (abs(nth) - 1)
        if day < 1:
            raise ValueError("nth weekday out of range")
        return dt.date(year, month, day)


def _expand_recurrence_dates(rrule: str, base_day: dt.date, window_start: dt.date, window_end: dt.date) -> list[dt.date]:
    """
    Minimal RRULE support for Apple holiday calendars.
    Currently supports:
    - FREQ=YEARLY with BYMONTH + BYMONTHDAY
    - FREQ=YEARLY with BYMONTH + BYDAY (e.g. 3MO, -1MO)
    Respects INTERVAL and COUNT when present.
    """
    rule = _parse_rrule(rrule)
    if rule.get("FREQ") != "YEARLY":
        return []

    interval = int(rule.get("INTERVAL", "1") or "1")
    count = int(rule["COUNT"]) if "COUNT" in rule and rule["COUNT"].isdigit() else None

    bymonth_s = rule.get("BYMONTH")
    if bymonth_s:
        try:
            month = int(bymonth_s.split(",")[0])
        except ValueError:
            return []
    else:
        # Apple sometimes omits BYMONTH/BYMONTHDAY for fixed-date yearly recurrences.
        month = base_day.month

    # Choose the first computed occurrence on/after window_start.year, then step by interval.
    start_year = base_day.year
    target_start_year = window_start.year
    if target_start_year <= start_year:
        first_year = start_year
    else:
        diff = target_start_year - start_year
        steps = (diff + interval - 1) // interval
        first_year = start_year + steps * interval

    out: list[dt.date] = []
    year = first_year
    while year <= window_end.year:
        idx = ((year - start_year) // interval) + 1
        if count is not None and idx > count:
            break

        occ: dt.date | None = None
        if "BYMONTHDAY" in rule:
            try:
                md = int(rule["BYMONTHDAY"].split(",")[0])
                occ = dt.date(year, month, md)
            except Exception:
                occ = None
        elif "BYDAY" in rule:
            tok = rule["BYDAY"].split(",")[0].strip().upper()
            m = re.match(r"^(-?\d+)?(MO|TU|WE|TH|FR|SA|SU)$", tok)
            if m:
                nth_s, wd_s = m.group(1), m.group(2)
                nth = int(nth_s) if nth_s else 1
                weekday_map = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
                try:
                    occ = _nth_weekday_of_month(year, month, weekday_map[wd_s], nth)
                except Exception:
                    occ = None
        else:
            # No BY* fields: use the base event's month/day.
            try:
                occ = dt.date(year, month, base_day.day)
            except Exception:
                occ = None

        if occ and window_start <= occ <= window_end:
            out.append(occ)

        year += interval

    return out


def _render_month_calendar(items: list[tuple[dt.date, str]], today: dt.date) -> str:
    # Use the month of the earliest upcoming holiday.
    month = items[0][0].month
    year = items[0][0].year

    holiday_map: dict[int, list[str]] = {}
    for d, title in items:
        if d.year == year and d.month == month:
            holiday_map.setdefault(d.day, []).append(title)

    month_name = dt.date(year, month, 1).strftime("%B")
    head = html.escape(f"{month_name} {year}")

    c = calmod.Calendar(firstweekday=6)  # Sunday
    weeks = c.monthdayscalendar(year, month)
    dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    parts: list[str] = []
    parts.append('<div class="holiday-mini" aria-label="Holiday calendar">')
    parts.append(f'  <div class="holiday-mini-head">{head}</div>')
    parts.append(f'  <div class="holiday-mini-grid" role="grid" aria-label="{head}">')

    for dow in dows:
        parts.append(f'    <div class="holiday-dow" role="columnheader">{html.escape(dow)}</div>')

    for week in weeks:
        for day in week:
            if day == 0:
                parts.append('    <div class="holiday-cell is-empty" role="gridcell"></div>')
                continue

            titles = holiday_map.get(day) or []
            classes = ["holiday-cell"]
            attrs: list[str] = []
            if titles:
                classes.append("is-holiday")
                # Tooltip with all holiday names that land on this day.
                tooltip = "; ".join(titles)
                attrs.append(f'title="{html.escape(tooltip)}"')
            if year == today.year and month == today.month and day == today.day:
                classes.append("is-today")

            class_attr = " ".join(classes)
            attrs_s = (" " + " ".join(attrs)) if attrs else ""
            parts.append(f'    <div class="{class_attr}" role="gridcell"{attrs_s}><span class="day">{day}</span></div>')

    parts.append("  </div>")
    parts.append("</div>")
    return "\n".join(parts)


def _replace_between_markers(text: str, replacement_html: str) -> str:
    start = text.find(START_MARK)
    end = text.find(END_MARK)
    if start == -1 or end == -1 or end < start:
        raise SystemExit(
            f"Missing markers in index.html. Expected {START_MARK} ... {END_MARK}"
        )

    # Replace whole lines between the marker lines, preserving indentation of END_MARK.
    start_line_start = text.rfind("\n", 0, start)
    start_line_start = 0 if start_line_start == -1 else start_line_start + 1
    indent = re.match(r"[ \t]*", text[start_line_start:start]).group(0)

    start_line_end = text.find("\n", start)
    if start_line_end == -1:
        raise SystemExit("Malformed index.html: start marker not followed by newline")
    start_line_end += 1

    indented = "\n".join(
        (indent + line) if line.strip() else indent.rstrip()
        for line in replacement_html.splitlines()
    )
    return text[:start_line_end] + indented + "\n" + indent + text[end:]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    ap.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    ap.add_argument("--horizon-days", type=int, default=180)
    ap.add_argument("--limit", type=int, default=8)
    ap.add_argument(
        "--today",
        help="Override 'today' as YYYY-MM-DD (defaults to local date).",
        default=None,
    )
    args = ap.parse_args()

    today = _parse_iso_date(args.today) if args.today else dt.date.today()

    if not args.input.exists():
        raise SystemExit(f"Missing calendar export: {args.input}")

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    events = payload.get("events") or []

    replacement = _render(events, today=today, horizon_days=args.horizon_days, limit=args.limit)

    index_text = args.index.read_text(encoding="utf-8")
    new_text = _replace_between_markers(index_text, replacement)
    args.index.write_text(new_text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
