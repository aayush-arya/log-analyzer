// node:sqlite is stable and built-in since Node.js 22 (no npm install needed)
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'log-analyzer.db');
export const db = new DatabaseSync(dbPath);

// node:sqlite uses exec() for PRAGMA — no .pragma() shorthand
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/** Convert PostgreSQL-style $1/$2 placeholders to SQLite ? */
function toSqlite(sql: string): string {
  return sql.replace(/\$\d+/g, '?');
}

const JSON_COLS = new Set(['full_result', 'ai_analysis']);

function parseRow<T>(row: Record<string, unknown>): T {
  for (const col of JSON_COLS) {
    if (col in row && typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col] as string); } catch { /* keep raw string */ }
    }
  }
  // SQLite stores booleans as 0/1
  if ('enabled' in row) row['enabled'] = row['enabled'] === 1 || row['enabled'] === true;
  return row as unknown as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any;

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const stmt = db.prepare(toSqlite(sql));
  const rows = (params?.length ? stmt.all(...(params as P[])) : stmt.all()) as Record<string, unknown>[];
  return rows.map(r => parseRow<T>(r));
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const stmt = db.prepare(toSqlite(sql));
  const row = (params?.length ? stmt.get(...(params as P[])) : stmt.get()) as Record<string, unknown> | undefined;
  return row ? parseRow<T>(row) : null;
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  const stmt = db.prepare(toSqlite(sql));
  if (params?.length) {
    stmt.run(...(params as P[]));
  } else {
    stmt.run();
  }
}
