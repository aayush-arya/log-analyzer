import { ParsedEntry, Severity } from './types';

interface ScoreResult {
  score: number;
  reasons: string[];
  severity: Severity;
}

export function scoreEntry(entry: ParsedEntry): ScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const msg = entry.message;
  const raw = entry.rawLine;
  const level = (entry.level || '').toUpperCase();

  // ── Level-based baseline ──────────────────────────────────────────────────
  if (['FATAL', 'EMERG', 'EMERGENCY'].includes(level)) {
    score += 75; reasons.push('Fatal/emergency log level');
  } else if (['CRITICAL', 'CRIT', 'ALERT'].includes(level)) {
    score += 65; reasons.push('Critical log level');
  } else if (['ERROR', 'ERR', 'SEVERE'].includes(level)) {
    score += 40; reasons.push('Error level log');
  } else if (['WARN', 'WARNING'].includes(level)) {
    score += 20; reasons.push('Warning level log');
  }

  // ── OOM ──────────────────────────────────────────────────────────────────
  if (/out of memory|oom.?kill|killed process|oom_kill|memory limit exceeded/i.test(msg)) {
    score += 90; reasons.push('OOM kill detected');
  }

  // ── Crashes & panics ─────────────────────────────────────────────────────
  if (/segfault|segmentation fault|core dump|panic:|fatal error|sigsegv|sigbus|aborted/i.test(msg)) {
    score += 80; reasons.push('Process crash/panic detected');
  }

  // ── HTTP 5xx ─────────────────────────────────────────────────────────────
  // Prefer the parsed metadata.status (Apache/Nginx parser sets this) to avoid
  // false-positive matches on the bytes field in access-log lines.
  const metaStatus = typeof entry.metadata?.status === 'number' ? entry.metadata.status as number : null;
  const rawStatus5xx = raw.match(/"[^"]*"\s+(5\d{2})\s/);  // only after request string
  const httpStatusCode = metaStatus && metaStatus >= 500 ? metaStatus
    : rawStatus5xx ? parseInt(rawStatus5xx[1], 10) : null;
  if (httpStatusCode) {
    const points = httpStatusCode === 503 ? 55 : httpStatusCode === 502 ? 60 : 65;
    score += points; reasons.push(`HTTP ${httpStatusCode} error`);
  }

  // ── Deadlock ─────────────────────────────────────────────────────────────
  if (/deadlock|dead.?lock detected/i.test(msg)) {
    score += 75; reasons.push('Deadlock detected');
  }

  // ── Authentication failures ───────────────────────────────────────────────
  if (/authentication fail|failed to authenticate|invalid credentials|login failed|incorrect password|bad password|wrong password/i.test(msg)) {
    score += 50; reasons.push('Authentication failure');
  }

  // ── Brute force indicators ────────────────────────────────────────────────
  if (/too many (failed|login|auth)|brute.?force|repeated (login|auth) fail/i.test(msg)) {
    score += 90; reasons.push('Brute force pattern detected');
  }

  // ── Privilege escalation ──────────────────────────────────────────────────
  if (/privilege.?escalat|unauthorized.*root|sudo.*ALL.*NOPASSWD|suid\s+shell/i.test(msg)) {
    score += 85; reasons.push('Potential privilege escalation');
  }

  // ── Security attacks ──────────────────────────────────────────────────────
  if (/sql.?injection|xss|cross.?site.?script|path.?traversal|directory.?traversal|command.?injection|remote.?code.?exec|rce/i.test(msg)) {
    score += 95; reasons.push('Security attack pattern detected');
  }

  // ── Disk pressure ────────────────────────────────────────────────────────
  if (/no space left|disk full|filesystem.*100%|disk.?pressure|storage.*full/i.test(msg)) {
    score += 70; reasons.push('Disk pressure detected');
  }

  // ── Database issues ───────────────────────────────────────────────────────
  if (/connection refused|could not connect.*database|database.*unavailable|max.*connection.*reached|too many connections/i.test(msg)) {
    score += 55; reasons.push('Database connectivity issue');
  }

  // ── Timeouts ─────────────────────────────────────────────────────────────
  if (/connection timed out|request timeout|read timeout|write timeout|deadline exceeded|context deadline|operation timed out/i.test(msg)) {
    score += 45; reasons.push('Timeout detected');
  }

  // ── TLS/SSL ──────────────────────────────────────────────────────────────
  if (/ssl error|certificate expired|certificate.?invalid|tls handshake|x509.*certificate|cert.*expired/i.test(msg)) {
    score += 50; reasons.push('SSL/TLS error');
  }

  // ── Memory pressure ───────────────────────────────────────────────────────
  if (/memory.*high|high.*memory|memory.*pressure|swap.*full|low.*memory/i.test(msg)) {
    score += 40; reasons.push('Memory pressure');
  }

  // ── Service unavailable ───────────────────────────────────────────────────
  if (/service unavailable|upstream.*(failed|error|timeout)|no healthy upstream|no backend/i.test(msg)) {
    score += 55; reasons.push('Service unavailability');
  }

  // ── Kubernetes ────────────────────────────────────────────────────────────
  if (/crashloopbackoff/i.test(msg)) { score += 85; reasons.push('Kubernetes CrashLoopBackOff'); }
  if (/oomkilled/i.test(msg)) { score += 85; reasons.push('Kubernetes OOMKilled'); }
  if (/evicted/i.test(msg)) { score += 60; reasons.push('Kubernetes pod evicted'); }
  if (/imagepullbackoff|errimagepull/i.test(msg)) { score += 40; reasons.push('Kubernetes image pull failure'); }
  if (/pending.*deadline|node.*pressure/i.test(msg)) { score += 50; reasons.push('Kubernetes scheduling failure'); }

  // ── Network ───────────────────────────────────────────────────────────────
  if (/connection reset|connection refused|network.?unreachable|host.?unreachable/i.test(msg)) {
    score += 35; reasons.push('Network connectivity issue');
  }

  // ── File system ───────────────────────────────────────────────────────────
  if (/permission denied|access denied|operation not permitted/i.test(msg)) {
    score += 35; reasons.push('Permission denied');
  }

  // ── Data corruption ───────────────────────────────────────────────────────
  if (/corrupt|corruption|checksum.*fail|data.*integrity/i.test(msg)) {
    score += 70; reasons.push('Data corruption detected');
  }

  score = Math.min(100, score);

  let severity: Severity;
  if (score >= 80) severity = 'critical';
  else if (score >= 60) severity = 'high';
  else if (score >= 30) severity = 'medium';
  else if (score >= 10) severity = 'low';
  else severity = 'normal';

  return { score, reasons, severity };
}
