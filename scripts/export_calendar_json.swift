#!/usr/bin/env swift
import EventKit
import Foundation

struct RangeInfo: Codable {
    let start: String
    let end: String
}

struct EventRow: Codable {
    let uid: String
    let calendar: String
    let title: String
    let start: String
    let end: String
    let allDay: Bool
    let date: String?
}

struct ExportPayload: Codable {
    let calendar: String
    let calendars: [String]
    let generatedAt: String
    let range: RangeInfo
    let events: [EventRow]
}

enum ExportError: Error, LocalizedError {
    case usage
    case invalidDate(String)
    case noCalendars([String])
    case calendarAccessDenied

    var errorDescription: String? {
        switch self {
        case .usage:
            return "Usage: export_calendar_json.swift \"Calendar Name[,Other Calendar]\" YYYY-MM-DD YYYY-MM-DD /path/to/out.json"
        case .invalidDate(let s):
            return "Invalid date: \(s)"
        case .noCalendars(let names):
            return "Calendar not found: \(names.joined(separator: ","))"
        case .calendarAccessDenied:
            return "Calendar access denied"
        }
    }
}

func parseDateOnly(_ s: String) throws -> Date {
    let fmt = DateFormatter()
    fmt.locale = Locale(identifier: "en_US_POSIX")
    fmt.timeZone = TimeZone.current
    fmt.dateFormat = "yyyy-MM-dd"
    guard let d = fmt.date(from: s) else {
        throw ExportError.invalidDate(s)
    }
    return d
}

func formatDateOnly(_ d: Date) -> String {
    let fmt = DateFormatter()
    fmt.locale = Locale(identifier: "en_US_POSIX")
    fmt.timeZone = TimeZone.current
    fmt.dateFormat = "yyyy-MM-dd"
    return fmt.string(from: d)
}

func formatISO8601UTC(_ d: Date) -> String {
    let fmt = ISO8601DateFormatter()
    fmt.timeZone = TimeZone(secondsFromGMT: 0)
    fmt.formatOptions = [.withInternetDateTime]
    return fmt.string(from: d)
}

func requestCalendarAccess(_ store: EKEventStore) -> Bool {
    let sem = DispatchSemaphore(value: 0)
    var granted = false

    if #available(macOS 14.0, *) {
        store.requestFullAccessToEvents { ok, _ in
            granted = ok
            sem.signal()
        }
    } else {
        store.requestAccess(to: .event) { ok, _ in
            granted = ok
            sem.signal()
        }
    }

    sem.wait()
    return granted
}

func normalizeCalendarNames(_ csv: String) -> [String] {
    return csv
        .split(separator: ",")
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
}

func selectCalendars(store: EKEventStore, requestedNames: [String]) -> [EKCalendar] {
    let all = store.calendars(for: .event)
    var out: [EKCalendar] = []

    for name in requestedNames {
        if let cal = all.first(where: { $0.title == name }) {
            out.append(cal)
        }
    }

    return out
}

func eventUID(_ e: EKEvent) -> String {
    if !e.calendarItemExternalIdentifier.isEmpty {
        return e.calendarItemExternalIdentifier
    }
    if let id = e.eventIdentifier, !id.isEmpty {
        return id
    }
    return UUID().uuidString
}

func main() throws {
    let args = CommandLine.arguments
    guard args.count == 5 else {
        throw ExportError.usage
    }

    let calendarNamesCSV = args[1]
    let startISO = args[2]
    let endISO = args[3]
    let outPath = args[4]

    let requested = normalizeCalendarNames(calendarNamesCSV)
    let startDay = try parseDateOnly(startISO)
    let endDay = try parseDateOnly(endISO)

    let cal = Calendar.current
    let startDate = cal.startOfDay(for: startDay)
    let endDate = cal.date(byAdding: DateComponents(day: 1, second: -1), to: cal.startOfDay(for: endDay)) ?? endDay

    let store = EKEventStore()
    guard requestCalendarAccess(store) else {
        throw ExportError.calendarAccessDenied
    }

    let selected = selectCalendars(store: store, requestedNames: requested)
    guard !selected.isEmpty else {
        throw ExportError.noCalendars(requested)
    }

    var rows: [EventRow] = []
    for calendar in selected {
        let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: [calendar])
        let events = store.events(matching: predicate)

        for e in events {
            let row = EventRow(
                uid: eventUID(e),
                calendar: calendar.title,
                title: e.title ?? "",
                start: formatISO8601UTC(e.startDate),
                end: formatISO8601UTC(e.endDate),
                allDay: e.isAllDay,
                date: e.isAllDay ? formatDateOnly(e.startDate) : nil
            )
            rows.append(row)
        }
    }

    rows.sort {
        if $0.start == $1.start { return $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        return $0.start < $1.start
    }

    let payload = ExportPayload(
        calendar: selected.first?.title ?? requested.first ?? "",
        calendars: selected.map { $0.title },
        generatedAt: formatISO8601UTC(Date()),
        range: RangeInfo(start: startISO, end: endISO),
        events: rows
    )

    let enc = JSONEncoder()
    enc.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
    let data = try enc.encode(payload)

    let outURL = URL(fileURLWithPath: outPath)
    try FileManager.default.createDirectory(at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: outURL)
}

do {
    try main()
} catch {
    fputs((error.localizedDescription + "\n"), stderr)
    exit(1)
}
