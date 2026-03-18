const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data'
  : path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'pickems.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    event_date TEXT,
    lock_time TEXT,
    is_locked INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    correct_nominee_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nominees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subtitle TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    nominee_id INTEGER NOT NULL REFERENCES nominees(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_role TEXT NOT NULL DEFAULT 'participant',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    UNIQUE(event_id, user_id)
  );
`);

// ── Migrations ───────────────────────────────────────────────

// Seed participants from existing picks if table was empty
const participantCount = db.prepare('SELECT COUNT(*) as c FROM event_participants').get().c;
if (participantCount === 0) {
  const existingPicks = db.prepare('SELECT DISTINCT user_id, event_id FROM picks').all();
  const insert = db.prepare('INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)');
  db.transaction(() => { for (const p of existingPicks) insert.run(p.event_id, p.user_id); })();
}

// Add participant_role column if it doesn't exist yet (for existing installs)
const cols = db.prepare("PRAGMA table_info(event_participants)").all();
if (!cols.find(c => c.name === 'participant_role')) {
  db.exec("ALTER TABLE event_participants ADD COLUMN participant_role TEXT NOT NULL DEFAULT 'participant'");
  console.log('Migrated: added participant_role to event_participants');
}

module.exports = db;
