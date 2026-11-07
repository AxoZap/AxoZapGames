ALTER TABLE "Geometry Dash" ADD COLUMN tier INTEGER CHECK (tier IS NULL OR (typeof(tier) = 'integer' AND tier >= 1));
ALTER TABLE "Geometry Dash" ADD COLUMN enjoyment REAL CHECK (enjoyment IS NULL OR (enjoyment >= 0 AND enjoyment <= 10));

CREATE TABLE gd_gddl_snapshots (
  level_id TEXT PRIMARY KEY,
  tier REAL,
  avg_enjoyment REAL,
  my_tier REAL,
  enjoyment REAL,
  fetched_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
);
