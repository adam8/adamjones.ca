use framework "Foundation"

-- Export events from one or more Apple Calendar calendars to a JSON snapshot (read-only).
--
-- Usage:
--   osascript scripts/export_calendar_json.applescript "Calendar Name[,Other Calendar]" 2026-02-10 2027-02-10 /path/to/out.json

on run argv
	if (count of argv) is not 4 then
		error "Usage: export_calendar_json.applescript \"Calendar Name\" YYYY-MM-DD YYYY-MM-DD /path/to/out.json" number 64
	end if
	
	set calNamesCSV to item 1 of argv
	set startISO to item 2 of argv
	set endISO to item 3 of argv
	set outPath to item 4 of argv
	
	set startDate to my dateFromISO(startISO, false)
	set endDate to my dateFromISO(endISO, true) -- inclusive end-of-day
	
	set requestedCalNames to my splitText(calNamesCSV, ",")
	set calendarNames to {}

	tell application "Calendar"
		repeat with rawName in requestedCalNames
			set calName to my trimText(rawName as text)
			if calName is not "" then
				set calList to calendars whose name is calName
				if (count of calList) > 0 then
					copy calName to end of calendarNames
				end if
			end if
		end repeat
	end tell

	if (count of calendarNames) is 0 then error "Calendar not found: " & calNamesCSV number 2
	
	set nowDate to my nowDate()
	set generatedAtISO to my iso8601UTCFromDate(nowDate)
	set startDayISO to my dateOnlyFromDate(startDate)
	set endDayISO to my dateOnlyFromDate(endDate)
	
	set json to "{"
	set json to json & "\"calendar\":\"" & my escapeJsonString((item 1 of calendarNames) as text) & "\","
	set json to json & "\"calendars\":" & my jsonArrayFromTextList(calendarNames) & ","
	set json to json & "\"generatedAt\":\"" & generatedAtISO & "\","
	set json to json & "\"range\":{\"start\":\"" & startDayISO & "\",\"end\":\"" & endDayISO & "\"},"
	set json to json & "\"events\":["

	set firstItem to true
	repeat with calName in calendarNames
		tell application "Calendar"
			set calList to calendars whose name is calName
			if (count of calList) is 0 then
				set evs to {}
			else
				set theCal to item 1 of calList
				-- Recurring events often have a base start date years in the past, so
				-- we can't filter purely on start date. Pull all events and filter in-script,
				-- including recurring base events with an RRULE.
				set evs to every event of theCal
			end if
		end tell
		
		repeat with e in evs
		tell application "Calendar"
			set t to summary of e
			set sd to start date of e
			set ed to end date of e
			set isAllDay to (allday event of e)
			set u to uid of e
			try
				set rrule to recurrence of e as text
			on error
				set rrule to ""
			end try
		end tell

		-- Include non-recurring events only if their start date is in-range.
		-- Always include recurring base events and let the consumer expand.
		if rrule is "" then
			if (sd < startDate) or (sd > endDate) then
				-- out of range, skip
			else
				set itemJson to "{"
				set itemJson to itemJson & "\"uid\":\"" & my escapeJsonString(u) & "\","
				set itemJson to itemJson & "\"calendar\":\"" & my escapeJsonString(calName as text) & "\","
				set itemJson to itemJson & "\"title\":\"" & my escapeJsonString(t) & "\","
				set itemJson to itemJson & "\"start\":\"" & my iso8601UTCFromDate(sd) & "\","
				set itemJson to itemJson & "\"end\":\"" & my iso8601UTCFromDate(ed) & "\","
				set itemJson to itemJson & "\"allDay\":" & my boolJson(isAllDay)
				if isAllDay then
					set itemJson to itemJson & ",\"date\":\"" & my dateOnlyFromDate(sd) & "\""
				end if
				set itemJson to itemJson & "}"
				
				if firstItem then
					set firstItem to false
				else
					set json to json & ","
				end if
				set json to json & itemJson
			end if
		else
			set itemJson to "{"
			set itemJson to itemJson & "\"uid\":\"" & my escapeJsonString(u) & "\","
			set itemJson to itemJson & "\"calendar\":\"" & my escapeJsonString(calName as text) & "\","
			set itemJson to itemJson & "\"title\":\"" & my escapeJsonString(t) & "\","
			set itemJson to itemJson & "\"start\":\"" & my iso8601UTCFromDate(sd) & "\","
			set itemJson to itemJson & "\"end\":\"" & my iso8601UTCFromDate(ed) & "\","
			set itemJson to itemJson & "\"allDay\":" & my boolJson(isAllDay) & ","
			set itemJson to itemJson & "\"recurrence\":\"" & my escapeJsonString(rrule) & "\""
			if isAllDay then
				set itemJson to itemJson & ",\"date\":\"" & my dateOnlyFromDate(sd) & "\""
			end if
			set itemJson to itemJson & "}"
			
			if firstItem then
				set firstItem to false
			else
				set json to json & ","
			end if
			set json to json & itemJson
		end if
		end repeat
	end repeat
	
	set json to json & "]}"
	
	my writeTextFile(outPath, json & linefeed)
	return outPath
end run

on dateFromISO(iso, isEndOfDay)
	-- iso: YYYY-MM-DD
	set fmt to current application's NSDateFormatter's alloc()'s init()
	fmt's setDateFormat:"yyyy-MM-dd"
	fmt's setLocale:(current application's NSLocale's localeWithLocaleIdentifier:"en_US_POSIX")
	set baseDate to fmt's dateFromString:iso
	if baseDate is missing value then error "Invalid date: " & iso number 65
	if isEndOfDay then
		return baseDate's dateByAddingTimeInterval:(23 * hours + 59 * minutes + 59)
	end if
	return baseDate
end dateFromISO

on nowDate()
	return current application's NSDate's |date|()
end nowDate

on iso8601UTCFromDate(d)
	set fmt to current application's NSDateFormatter's alloc()'s init()
	fmt's setDateFormat:"yyyy-MM-dd'T'HH:mm:ss'Z'"
	fmt's setLocale:(current application's NSLocale's localeWithLocaleIdentifier:"en_US_POSIX")
	fmt's setTimeZone:(current application's NSTimeZone's timeZoneForSecondsFromGMT:0)
	return (fmt's stringFromDate:d) as text
end iso8601UTCFromDate

on dateOnlyFromDate(d)
	set fmt to current application's NSDateFormatter's alloc()'s init()
	fmt's setDateFormat:"yyyy-MM-dd"
	fmt's setLocale:(current application's NSLocale's localeWithLocaleIdentifier:"en_US_POSIX")
	return (fmt's stringFromDate:d) as text
end dateOnlyFromDate

on lpad2(n)
	if n < 10 then return "0" & (n as text)
	return n as text
end lpad2

on lpad4(n)
	set s to n as text
	repeat while (count of s) < 4
		set s to "0" & s
	end repeat
	return s
end lpad4

on boolJson(b)
	if b then return "true"
	return "false"
end boolJson

on escapeJsonString(s)
	set s to s as text
	set s to my replaceText("\\", "\\\\", s)
	set s to my replaceText("\"", "\\\"", s)
	set s to my replaceText(return, "\\n", s)
	set s to my replaceText(linefeed, "\\n", s)
	set s to my replaceText(tab, "\\t", s)
	return s
end escapeJsonString

on replaceText(findText, replaceWith, theText)
	set oldTID to AppleScript's text item delimiters
	set AppleScript's text item delimiters to findText
	set parts to text items of theText
	set AppleScript's text item delimiters to replaceWith
	set outText to parts as text
	set AppleScript's text item delimiters to oldTID
	return outText
end replaceText

on splitText(theText, delim)
	set oldTID to AppleScript's text item delimiters
	set AppleScript's text item delimiters to delim
	set parts to text items of theText
	set AppleScript's text item delimiters to oldTID
	return parts
end splitText

on trimText(theText)
	set s to theText as text
	set ws to {space, tab, return, linefeed}
	repeat while (length of s) > 0 and (character 1 of s) is in ws
		if (length of s) is 1 then return ""
		set s to text 2 thru -1 of s
	end repeat
	repeat while (length of s) > 0 and (character -1 of s) is in ws
		if (length of s) is 1 then return ""
		set s to text 1 thru -2 of s
	end repeat
	return s
end trimText

on jsonArrayFromTextList(itemsList)
	set outJson to "["
	set firstItem to true
	repeat with it in itemsList
		if firstItem then
			set firstItem to false
		else
			set outJson to outJson & ","
		end if
		set outJson to outJson & "\"" & my escapeJsonString(it as text) & "\""
	end repeat
	set outJson to outJson & "]"
	return outJson
end jsonArrayFromTextList

on writeTextFile(posixPath, contents)
	set f to POSIX file posixPath
	set fh to open for access f with write permission
	try
		set eof of fh to 0
		write contents to fh as «class utf8»
	on error errMsg number errNum
		try
			close access fh
		end try
		error errMsg number errNum
	end try
	close access fh
end writeTextFile
