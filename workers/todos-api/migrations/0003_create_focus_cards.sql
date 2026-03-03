CREATE TABLE IF NOT EXISTS focus_cards (
  slot TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (slot IN ('primary-focus', 'current-mode')),
  CHECK (length(trim(label)) > 0 AND length(label) <= 80),
  CHECK (length(trim(front_text)) > 0 AND length(front_text) <= 280),
  CHECK (length(trim(back_text)) > 0 AND length(back_text) <= 280)
);

INSERT OR IGNORE INTO focus_cards (
  slot,
  label,
  front_text,
  back_text,
  created_at,
  updated_at
)
VALUES
  (
    'primary-focus',
    'Primary focus',
    'What is worth doing carefully today so the rest of the system stays predictable?',
    'Calm execution. Finish the small things that keep bigger systems predictable.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'current-mode',
    'Current mode',
    'How am I shipping work right now without losing the thread between steps?',
    'Shipping in compact steps with enough context to make each one stick.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );
