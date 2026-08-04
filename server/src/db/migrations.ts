import { v4 as uuidv4 } from 'uuid';
import { db } from './index';

export async function runMigrations(): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      filename     TEXT NOT NULL,
      format       TEXT NOT NULL,
      created_at   DATETIME DEFAULT (datetime('now')),
      total_lines  INTEGER NOT NULL DEFAULT 0,
      anomaly_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      health_score  INTEGER NOT NULL DEFAULT 100,
      critical_count INTEGER NOT NULL DEFAULT 0,
      high_count    INTEGER NOT NULL DEFAULT 0,
      medium_count  INTEGER NOT NULL DEFAULT 0,
      ai_analysis   TEXT,
      full_result   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

    CREATE TABLE IF NOT EXISTS alert_configs (
      id                TEXT PRIMARY KEY,
      critical_threshold INTEGER NOT NULL DEFAULT 5,
      high_threshold     INTEGER NOT NULL DEFAULT 10,
      enabled            INTEGER DEFAULT 1,
      webhook_url        TEXT,
      webhook_type       TEXT DEFAULT 'slack',
      email_recipient    TEXT,
      created_at         DATETIME DEFAULT (datetime('now')),
      updated_at         DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Seed default alert config if none exists
  const existing = db.prepare('SELECT id FROM alert_configs LIMIT 1').get();
  if (!existing) {
    db.prepare(
      'INSERT INTO alert_configs (id, critical_threshold, high_threshold, enabled) VALUES (?, ?, ?, ?)',
    ).run(uuidv4(), 5, 10, 1);
  }

  console.log('SQLite migrations applied ✓');
}
