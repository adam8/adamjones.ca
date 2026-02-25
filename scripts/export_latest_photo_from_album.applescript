use framework "Foundation"

-- Export the most recent media item from a Photos album to a directory.
--
-- Usage:
--   osascript scripts/export_latest_photo_from_album.applescript "Daily Sketch" /tmp/export-dir
--
-- Output:
--   JSON on stdout, e.g.:
--   {"ok":true,"item_id":"...","filename":"IMG_1234.HEIC","sketch_at":"2026-02-25T21:03:10Z"}

on run argv
	if (count of argv) is not 2 then
		error "Usage: export_latest_photo_from_album.applescript \"Album Name\" /path/to/export-dir" number 64
	end if
	
	set albumName to item 1 of argv
	set exportDir to item 2 of argv
	if albumName is "" then error "Album name cannot be empty." number 65
	if exportDir is "" then error "Export directory cannot be empty." number 65
	
	set itemId to ""
	set itemFilename to ""
	set sketchAtISO to ""
	
	tell application "Photos"
		set albumMatches to albums whose name is albumName
		if (count of albumMatches) is 0 then
			error "Album not found: " & albumName number 2
		end if
		
		set targetAlbum to item 1 of albumMatches
		set mediaItems to (get media items of targetAlbum)
		if (count of mediaItems) is 0 then
			return "{\"ok\":false,\"reason\":\"empty\"}"
		end if
		
		set latestItem to item 1 of mediaItems
		repeat with candidate in mediaItems
			if (date of candidate) > (date of latestItem) then
				set latestItem to candidate
			end if
		end repeat
		
		set itemId to (id of latestItem) as text
		set itemFilename to (filename of latestItem) as text
		set sketchAtISO to my iso8601UTCFromDate((date of latestItem))
		
		export {latestItem} to (POSIX file exportDir) with using originals
	end tell
	
	set json to "{"
	set json to json & "\"ok\":true,"
	set json to json & "\"item_id\":\"" & my escapeJsonString(itemId) & "\","
	set json to json & "\"filename\":\"" & my escapeJsonString(itemFilename) & "\","
	set json to json & "\"sketch_at\":\"" & sketchAtISO & "\""
	set json to json & "}"
	return json
end run

on iso8601UTCFromDate(d)
	set fmt to current application's NSDateFormatter's alloc()'s init()
	fmt's setDateFormat:"yyyy-MM-dd'T'HH:mm:ss'Z'"
	fmt's setLocale:(current application's NSLocale's localeWithLocaleIdentifier:"en_US_POSIX")
	fmt's setTimeZone:(current application's NSTimeZone's timeZoneForSecondsFromGMT:0)
	return (fmt's stringFromDate:d) as text
end iso8601UTCFromDate

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
