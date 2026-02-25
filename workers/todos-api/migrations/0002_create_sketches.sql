CREATE TABLE IF NOT EXISTS sketches (
  id TEXT PRIMARY KEY,
  sketch_at TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(note) <= 280)
);

CREATE INDEX IF NOT EXISTS idx_sketches_at_desc
  ON sketches (sketch_at DESC, created_at DESC);
