CREATE TABLE IF NOT EXISTS gift_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  used INTEGER NOT NULL DEFAULT 0,
  recipient_gmail TEXT,
  distributed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
