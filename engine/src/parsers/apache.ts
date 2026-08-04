import { ParsedEntry } from '../types';

// Combined Log Format: %h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-agent}i"
const APACHE_COMBINED = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)" (\d{3}) (\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?/;
// Common Log Format
const APACHE_COMMON = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)" (\d{3}) (\S+)/;
// Nginx error format
const NGINX_ERROR = /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+\d+#\d+:\s+(.+)/;

export function parseApache(line: string, lineNumber: number): ParsedEntry | null {
  let m = APACHE_COMBINED.exec(line) || APACHE_COMMON.exec(line);
  if (m) {
    const status = parseInt(m[6], 10);
    const method_path = m[5];
    const [method, path] = method_path.split(' ');
    return {
      lineNumber,
      timestamp: parseApacheDate(m[4]),
      level: statusToLevel(status),
      message: `${method || 'GET'} ${path || '/'} → ${status}`,
      source: 'apache',
      rawLine: line,
      metadata: {
        ip: m[1],
        user: m[3] !== '-' ? m[3] : undefined,
        method: method || 'GET',
        path: path || '/',
        status,
        bytes: m[7] !== '-' ? parseInt(m[7], 10) : 0,
        referer: m[8],
        userAgent: m[9],
      },
    };
  }

  m = NGINX_ERROR.exec(line);
  if (m) {
    return {
      lineNumber,
      timestamp: m[1],
      level: m[2].toUpperCase(),
      message: m[3],
      source: 'nginx',
      rawLine: line,
      metadata: {},
    };
  }

  return null;
}

function parseApacheDate(raw: string): string {
  // e.g. "10/Oct/2000:13:55:36 -0700"
  try {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const m = raw.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})/);
    if (!m) return raw;
    return `${m[3]}-${months[m[2]] || '01'}-${m[1]}T${m[4]}Z`;
  } catch {
    return raw;
  }
}

function statusToLevel(status: number): string {
  if (status >= 500) return 'ERROR';
  if (status >= 400) return 'WARN';
  return 'INFO';
}
