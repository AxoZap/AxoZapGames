CREATE TABLE "Geometry Dash" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  rating TEXT,
  gauntlet INTEGER NOT NULL DEFAULT 0,
  weekly INTEGER NOT NULL DEFAULT 0,
  event INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER,
  attempts INTEGER,
  video_url TEXT,
  level_id TEXT
);

CREATE TABLE "Celeste" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  placement INTEGER,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT 'Initial',
  attempts INTEGER,
  clip TEXT,
  hidden INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  group_name TEXT,
  completed INTEGER DEFAULT 1
);

CREATE TABLE "Celeste Groups" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  date TEXT,
  url TEXT,
  attempts INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  placement INTEGER DEFAULT 0
);
