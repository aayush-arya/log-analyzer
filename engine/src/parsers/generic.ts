import { ParsedEntry } from '../types';

// ISO timestamp + level: 2024-01-15T10:30:00Z [ERROR] message
const ISO_LEVEL = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+\[?(\w+)\]?\s*(.*)/;
// Level + timestamp: ERROR 2024-01-15 10:30:00 message
const LEVEL_ISO = /^(\w+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.*)/;
// Python logging: 2024-01-15 10:30:00,123 - module - LEVEL - message
const PYTHON = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+-\s+(\S+)\s+-\s+(\w+)\s+-\s+(.*)/;
// Spring Boot: 2024-01-15 10:30:00.123 ERROR 1 --- [thread] logger : message
const SPRING = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+(\w+)\s+\d+\s+---\s+\[([^\]]+)\]\s+(\S+)\s*:\s*(.*)/;
// Log4j: 2024-01-15 10:30:00,123 [main] ERROR com.example.App - message
const LOG4J = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[,.]\d+)\s+\[([^\]]+)\]\s+(\w+)\s+(\S+)\s+-\s+(.*)/;
// Level only at start: ERROR: message or [ERROR] message
const LEVEL_ONLY = /^\[?(\w+)\]?:\s+(.*)/;
// Bare timestamp
const TIMESTAMP_ONLY = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(.*)/;

const KNOWN_LEVELS = new Set([
  'TRACE', 'DEBUG', 'INFO', 'NOTICE', 'WARN', 'WARNING',
  'ERROR', 'ERR', 'CRITICAL', 'CRIT', 'FATAL', 'EMERG', 'ALERT', 'SEVERE',
]);

export function parseGeneric(line: string, lineNumber: number): ParsedEntry {
  let m: RegExpExecArray | null;

  m = PYTHON.exec(line);
  if (m) {
    return entry(lineNumber, line, m[1].replace(',', '.'), m[3], m[4], m[2]);
  }

  m = SPRING.exec(line);
  if (m) {
    return entry(lineNumber, line, m[1], m[2], m[5], m[4], { thread: m[3] });
  }

  m = LOG4J.exec(line);
  if (m) {
    return entry(lineNumber, line, m[1].replace(',', '.'), m[3], m[5], m[4], { thread: m[2] });
  }

  m = ISO_LEVEL.exec(line);
  if (m && KNOWN_LEVELS.has(m[2].toUpperCase())) {
    return entry(lineNumber, line, m[1], m[2], m[3]);
  }

  m = LEVEL_ISO.exec(line);
  if (m && KNOWN_LEVELS.has(m[1].toUpperCase())) {
    return entry(lineNumber, line, m[2], m[1], m[3]);
  }

  m = TIMESTAMP_ONLY.exec(line);
  if (m) {
    const level = detectLevel(m[2]);
    return entry(lineNumber, line, m[1], level, m[2]);
  }

  m = LEVEL_ONLY.exec(line);
  if (m && KNOWN_LEVELS.has(m[1].toUpperCase())) {
    return entry(lineNumber, line, null, m[1], m[2]);
  }

  const level = detectLevel(line);
  return entry(lineNumber, line, null, level, line);
}

function entry(
  lineNumber: number,
  rawLine: string,
  timestamp: string | null,
  level: string,
  message: string,
  source = 'app',
  metadata: Record<string, unknown> = {},
): ParsedEntry {
  return { lineNumber, timestamp, level: normalizeLevel(level), message, source, rawLine, metadata };
}

function normalizeLevel(level: string): string {
  const l = level.toUpperCase();
  if (['FATAL', 'EMERG', 'EMERGENCY'].includes(l)) return 'FATAL';
  if (['CRITICAL', 'CRIT', 'ALERT'].includes(l)) return 'CRITICAL';
  if (['ERROR', 'ERR', 'SEVERE'].includes(l)) return 'ERROR';
  if (['WARNING', 'WARN'].includes(l)) return 'WARN';
  if (['NOTICE', 'INFO', 'INFORMATION'].includes(l)) return 'INFO';
  if (['DEBUG', 'TRACE', 'VERBOSE'].includes(l)) return 'DEBUG';
  return level || 'INFO';
}

function detectLevel(text: string): string {
  if (/\b(FATAL|fatal|EMERG|emerg)\b/.test(text)) return 'FATAL';
  if (/\b(CRITICAL|critical|CRIT|crit)\b/.test(text)) return 'CRITICAL';
  if (/\b(ERROR|error|ERR|err)\b/.test(text)) return 'ERROR';
  if (/\b(WARN|warn|WARNING|warning)\b/.test(text)) return 'WARN';
  if (/\b(DEBUG|debug|TRACE|trace)\b/.test(text)) return 'DEBUG';
  if (/error|fail|exception|crash|panic/i.test(text)) return 'ERROR';
  if (/warn|caution|deprecated/i.test(text)) return 'WARN';
  return 'INFO';
}
