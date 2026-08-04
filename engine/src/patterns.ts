import { LogEntry, BurstPattern, PatternSummary, Severity } from './types';

interface TimeEntry {
  timestamp: Date | null;
  entry: LogEntry;
}

export function detectPatterns(entries: LogEntry[]): PatternSummary {
  const byLevel: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const e of entries) {
    const l = e.level || 'UNKNOWN';
    byLevel[l] = (byLevel[l] || 0) + 1;
    const s = e.source || 'unknown';
    bySource[s] = (bySource[s] || 0) + 1;
  }

  const timed: TimeEntry[] = entries
    .map(e => ({ timestamp: e.timestamp ? parseDate(e.timestamp) : null, entry: e }))
    .filter(e => e.timestamp !== null)
    .sort((a, b) => (a.timestamp!.getTime() - b.timestamp!.getTime()));

  const burstPatterns: BurstPattern[] = [
    ...detectAuthBrute(timed),
    ...detect5xxBurst(timed),
    ...detectCrashLoop(timed),
    ...detectTimeoutBurst(timed),
    ...detectOOMBurst(timed),
  ];

  // Remove duplicates by type
  const seen = new Set<string>();
  const uniquePatterns = burstPatterns.filter(p => {
    if (seen.has(p.type)) return false;
    seen.add(p.type);
    return true;
  });

  return { byLevel, bySource, burstPatterns: uniquePatterns };
}

function detectAuthBrute(entries: TimeEntry[]): BurstPattern[] {
  const authFail = entries.filter(e =>
    /authentication fail|failed.*password|invalid.*credentials|login fail|bad password/i.test(e.entry.message)
  );
  const bursts = slidingWindow(authFail, 10_000, 5);
  if (bursts.length === 0) return [];
  return [{
    type: 'brute_force',
    count: bursts.length,
    timeWindowSeconds: 10,
    description: `Brute force detected: ${bursts.length} authentication failures within 10 seconds`,
    severity: 'critical',
  }];
}

function detect5xxBurst(entries: TimeEntry[]): BurstPattern[] {
  const errors5xx = entries.filter(e => /\b5\d{2}\b/.test(e.entry.rawLine));
  const bursts = slidingWindow(errors5xx, 60_000, 10);
  if (bursts.length === 0) return [];
  return [{
    type: 'error_spike',
    count: bursts.length,
    timeWindowSeconds: 60,
    description: `Error spike: ${bursts.length} HTTP 5xx errors within 60 seconds`,
    severity: 'high',
  }];
}

function detectCrashLoop(entries: TimeEntry[]): BurstPattern[] {
  const crashes = entries.filter(e =>
    /crash|panic:|fatal error|segfault|core dump|killed|terminated|exit.*code [^0]/i.test(e.entry.message)
  );
  const bursts = slidingWindow(crashes, 300_000, 5);
  if (bursts.length === 0) return [];
  return [{
    type: 'crash_loop',
    count: bursts.length,
    timeWindowSeconds: 300,
    description: `Crash loop: ${bursts.length} process crashes within 5 minutes`,
    severity: 'critical',
  }];
}

function detectTimeoutBurst(entries: TimeEntry[]): BurstPattern[] {
  const timeouts = entries.filter(e =>
    /timeout|timed out|deadline exceeded/i.test(e.entry.message)
  );
  const bursts = slidingWindow(timeouts, 60_000, 15);
  if (bursts.length === 0) return [];
  return [{
    type: 'timeout_storm',
    count: bursts.length,
    timeWindowSeconds: 60,
    description: `Timeout storm: ${bursts.length} timeouts within 60 seconds`,
    severity: 'high',
  }];
}

function detectOOMBurst(entries: TimeEntry[]): BurstPattern[] {
  const ooms = entries.filter(e =>
    /out of memory|oom.?kill|memory.?limit/i.test(e.entry.message)
  );
  if (ooms.length >= 3) {
    return [{
      type: 'memory_pressure',
      count: ooms.length,
      timeWindowSeconds: 0,
      description: `Memory pressure: ${ooms.length} OOM events detected`,
      severity: 'critical',
    }];
  }
  return [];
}

function slidingWindow(entries: TimeEntry[], windowMs: number, threshold: number): TimeEntry[] {
  if (entries.length < threshold) return [];
  for (let i = 0; i <= entries.length - threshold; i++) {
    const start = entries[i].timestamp!.getTime();
    const end = entries[i + threshold - 1].timestamp!.getTime();
    if (end - start <= windowMs) {
      return entries.slice(i, i + threshold);
    }
  }
  return [];
}

function parseDate(ts: string): Date | null {
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    normal: '#6b7280',
  };
  return colors[severity];
}
