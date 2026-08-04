import { ParsedEntry, LogFormat } from '../types';
import { parseApache } from './apache';
import { parseSyslog } from './syslog';
import { parseJsonLog } from './json-log';
import { parseKubernetes } from './kubernetes';
import { parseGeneric } from './generic';

export function detectFormat(lines: string[]): LogFormat {
  const sample = lines.slice(0, 20).filter(Boolean);
  let apacheScore = 0, syslogScore = 0, jsonScore = 0, k8sScore = 0;

  for (const line of sample) {
    if (!line.trim()) continue;
    if (line.trim().startsWith('{')) jsonScore += 2;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+(stdout|stderr)/.test(line)) k8sScore += 3;
    if (/^[IWEF]\d{4}\s+\d{2}:\d{2}:\d{2}/.test(line)) k8sScore += 2;
    if (/^\S+\s+\S+\s+\S+\s+\[[^\]]+\]\s+"/.test(line)) apacheScore += 3;
    if (/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+\S+/.test(line)) syslogScore += 2;
    if (/^<\d+>/.test(line)) syslogScore += 3;
  }

  const max = Math.max(apacheScore, syslogScore, jsonScore, k8sScore);
  if (max === 0) return 'generic';
  if (k8sScore === max) return 'kubernetes';
  if (jsonScore === max) return 'json';
  if (apacheScore === max) return 'apache';
  if (syslogScore === max) return 'syslog';
  return 'generic';
}

export function parseLine(line: string, lineNumber: number, format: LogFormat): ParsedEntry {
  if (!line.trim()) {
    return { lineNumber, timestamp: null, level: 'INFO', message: '', source: 'app', rawLine: line, metadata: {} };
  }

  let parsed: ParsedEntry | null = null;

  switch (format) {
    case 'apache':
    case 'nginx':
      parsed = parseApache(line, lineNumber);
      break;
    case 'syslog':
      parsed = parseSyslog(line, lineNumber);
      break;
    case 'json':
      parsed = parseJsonLog(line, lineNumber);
      break;
    case 'kubernetes':
      parsed = parseKubernetes(line, lineNumber);
      break;
    default:
      break;
  }

  // Fallback: try all parsers then generic
  if (!parsed) {
    parsed = parseJsonLog(line, lineNumber)
      || parseApache(line, lineNumber)
      || parseSyslog(line, lineNumber)
      || parseKubernetes(line, lineNumber)
      || parseGeneric(line, lineNumber);
  }

  return parsed;
}
