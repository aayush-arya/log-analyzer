import { ParsedEntry } from '../types';

// Standard k8s log format: 2024-01-15T10:30:00.123456789Z stderr F <message>
const K8S_LINE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(stdout|stderr)\s+([PF])\s+(.*)/;
// glog format: E0115 10:30:00.123456 1 main.go:42] Error starting
const GLOG = /^([IWEF])(\d{4})\s+(\d{2}:\d{2}:\d{2}\.\d+)\s+\d+\s+([^:]+:\d+)\]\s*(.*)/;
// kubectl logs with container prefix: [container-name] actual log line
const KUBECTL_PREFIX = /^\[([^\]]+)\]\s+(.*)/;

const GLOG_LEVELS: Record<string, string> = { I: 'INFO', W: 'WARN', E: 'ERROR', F: 'FATAL' };

export function parseKubernetes(line: string, lineNumber: number): ParsedEntry | null {
  let m = K8S_LINE.exec(line);
  if (m) {
    const isStderr = m[2] === 'stderr';
    const isPartial = m[3] === 'P';
    const inner = m[4];
    const glogMatch = GLOG.exec(inner);
    if (glogMatch) {
      const year = new Date().getFullYear();
      const mmdd = glogMatch[2]; // MMDD
      const mm = mmdd.slice(0, 2);
      const dd = mmdd.slice(2, 4);
      return {
        lineNumber,
        timestamp: `${year}-${mm}-${dd}T${glogMatch[3]}Z`,
        level: GLOG_LEVELS[glogMatch[1]] || 'INFO',
        message: `[${glogMatch[4]}] ${glogMatch[5]}`,
        source: 'kubernetes',
        rawLine: line,
        metadata: { stream: m[2], partial: isPartial, file: glogMatch[4] },
      };
    }
    return {
      lineNumber,
      timestamp: m[1],
      level: isStderr ? 'ERROR' : 'INFO',
      message: inner,
      source: 'kubernetes',
      rawLine: line,
      metadata: { stream: m[2], partial: isPartial },
    };
  }

  m = GLOG.exec(line);
  if (m) {
    const year = new Date().getFullYear();
    const mmdd = m[2];
    return {
      lineNumber,
      timestamp: `${year}-${mmdd.slice(0, 2)}-${mmdd.slice(2, 4)}T${m[3]}Z`,
      level: GLOG_LEVELS[m[1]] || 'INFO',
      message: `[${m[4]}] ${m[5]}`,
      source: 'kubernetes',
      rawLine: line,
      metadata: { file: m[4] },
    };
  }

  // Check for common k8s event patterns
  if (/CrashLoopBackOff|OOMKilled|Evicted|ImagePullBackOff|Pending|Terminating/i.test(line)) {
    const prefixMatch = KUBECTL_PREFIX.exec(line);
    return {
      lineNumber,
      timestamp: null,
      level: 'ERROR',
      message: prefixMatch ? prefixMatch[2] : line,
      source: prefixMatch ? prefixMatch[1] : 'kubernetes',
      rawLine: line,
      metadata: {},
    };
  }

  return null;
}
