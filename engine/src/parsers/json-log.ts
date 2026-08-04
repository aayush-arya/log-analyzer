import { ParsedEntry } from '../types';

const LEVEL_FIELDS = ['level', 'severity', 'log_level', 'lvl', 'loglevel', 'log.level'];
const MESSAGE_FIELDS = ['message', 'msg', 'log', 'body', 'text', 'event'];
const TIMESTAMP_FIELDS = ['timestamp', 'time', '@timestamp', 'ts', 'datetime', 'date', 'created_at'];
const SOURCE_FIELDS = ['service', 'source', 'app', 'application', 'component', 'module', 'logger'];

export function parseJsonLog(line: string, lineNumber: number): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;

    const level = extractField(obj, LEVEL_FIELDS) || 'INFO';
    const message = extractField(obj, MESSAGE_FIELDS) || trimmed.slice(0, 200);
    const timestamp = extractField(obj, TIMESTAMP_FIELDS);
    const source = extractField(obj, SOURCE_FIELDS) || 'app';

    return {
      lineNumber,
      timestamp: timestamp ? normalizeTimestamp(timestamp) : null,
      level: normalizeLevel(level),
      message,
      source,
      rawLine: line,
      metadata: flattenMetadata(obj, [...LEVEL_FIELDS, ...MESSAGE_FIELDS, ...TIMESTAMP_FIELDS, ...SOURCE_FIELDS]),
    };
  } catch {
    return null;
  }
}

function extractField(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    if (f.includes('.')) {
      const parts = f.split('.');
      let cur: unknown = obj;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else { cur = undefined; break; }
      }
      if (cur !== undefined && cur !== null) return String(cur);
    } else if (f in obj && obj[f] !== null && obj[f] !== undefined) {
      return String(obj[f]);
    }
  }
  return null;
}

function normalizeLevel(level: string): string {
  const l = level.toUpperCase();
  if (['FATAL', 'EMERGENCY', 'EMERG'].includes(l)) return 'FATAL';
  if (['CRITICAL', 'CRIT', 'ALERT'].includes(l)) return 'CRITICAL';
  if (['ERROR', 'ERR', 'SEVERE'].includes(l)) return 'ERROR';
  if (['WARNING', 'WARN'].includes(l)) return 'WARN';
  if (['NOTICE', 'INFO', 'INFORMATION'].includes(l)) return 'INFO';
  if (['DEBUG', 'TRACE', 'VERBOSE'].includes(l)) return 'DEBUG';
  return l || 'INFO';
}

function normalizeTimestamp(raw: string): string {
  try {
    return new Date(raw).toISOString();
  } catch {
    return raw;
  }
}

function flattenMetadata(obj: Record<string, unknown>, exclude: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!exclude.includes(k) && typeof v !== 'object') {
      result[k] = v;
    }
  }
  return result;
}
