import { ParsedEntry } from '../types';

// RFC 3164: Oct 11 22:14:15 myhost sshd[1234]: Failed password
const RFC3164 = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.+)/;
// RFC 5424: <34>1 2003-10-11T22:14:15.003Z myhost sshd 1234 - - Failed password
const RFC5424 = /^<(\d+)>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)/;
// systemd journal: Jun 14 15:16:01 host systemd[1]: Starting ...
const SYSTEMD = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+)/;

const SEVERITY_KEYWORDS: Record<string, string> = {
  emerg: 'EMERG', alert: 'ALERT', crit: 'CRIT', error: 'ERROR',
  err: 'ERROR', warning: 'WARN', notice: 'NOTICE', info: 'INFO',
  debug: 'DEBUG',
};

export function parseSyslog(line: string, lineNumber: number): ParsedEntry | null {
  let m = RFC5424.exec(line);
  if (m) {
    const priority = parseInt(m[1], 10);
    const severity = priority & 0x07;
    const severityNames = ['EMERG', 'ALERT', 'CRIT', 'ERROR', 'WARN', 'NOTICE', 'INFO', 'DEBUG'];
    return {
      lineNumber,
      timestamp: m[3],
      level: severityNames[severity] || 'INFO',
      message: m[9],
      source: m[5] !== '-' ? m[5] : m[4],
      rawLine: line,
      metadata: { host: m[4], pid: m[6] !== '-' ? m[6] : undefined, facility: Math.floor(priority / 8) },
    };
  }

  m = RFC3164.exec(line);
  if (m) {
    const level = detectLevelFromMessage(m[5]);
    return {
      lineNumber,
      timestamp: parseRFC3164Date(m[1]),
      level,
      message: m[5],
      source: m[3],
      rawLine: line,
      metadata: { host: m[2], process: m[3], pid: m[4] },
    };
  }

  m = SYSTEMD.exec(line);
  if (m) {
    const level = detectLevelFromMessage(m[3]);
    return {
      lineNumber,
      timestamp: parseRFC3164Date(m[1]),
      level,
      message: m[3],
      source: 'syslog',
      rawLine: line,
      metadata: { host: m[2] },
    };
  }

  return null;
}

function parseRFC3164Date(raw: string): string {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const m = raw.trim().match(/^(\w{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})$/);
  if (!m) return raw;
  const year = new Date().getFullYear();
  const day = m[2].padStart(2, '0');
  return `${year}-${months[m[1]] || '01'}-${day}T${m[3]}Z`;
}

function detectLevelFromMessage(msg: string): string {
  const lower = msg.toLowerCase();
  for (const [kw, level] of Object.entries(SEVERITY_KEYWORDS)) {
    if (lower.includes(kw)) return level;
  }
  if (/fail|error|denied|refused|invalid|wrong/i.test(msg)) return 'ERROR';
  return 'INFO';
}
