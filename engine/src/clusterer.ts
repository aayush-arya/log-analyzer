import { LogEntry, ErrorCluster, Severity } from './types';

const VAR_PATTERNS: [RegExp, string][] = [
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<IP>'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>'],
  [/\b[0-9a-f]{32,}\b/gi, '<HASH>'],
  [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<TS>'],
  [/\b0x[0-9a-f]+\b/gi, '<HEX>'],
  [/\b\d+ms\b/g, '<MS>'],
  [/\b\d+\.\d+s\b/g, '<SEC>'],
  [/\b\d+[kmg]?b\b/gi, '<BYTES>'],
  [/"[^"]{20,}"/g, '"<STR>"'],
  [/'[^']{20,}'/g, "'<STR>'"],
  [/`[^`]{20,}`/g, '`<STR>`'],
  [/\/[a-zA-Z0-9_\-/.]+\/[a-zA-Z0-9_\-.]+/g, '<PATH>'],
  [/\b\d{4,}\b/g, '<N>'],
  [/\b\d{1,3}\b/g, '<n>'],
];

export function clusterEntries(entries: LogEntry[]): { entries: LogEntry[]; clusters: ErrorCluster[] } {
  const templateMap = new Map<string, ErrorCluster>();
  const entryMap = new Map<string, LogEntry>();

  for (const entry of entries) {
    // Only cluster anomalous entries
    if (entry.severity === 'normal' || entry.severity === 'low') {
      entryMap.set(entry.id, entry);
      continue;
    }

    const template = extractTemplate(entry.message);
    const existing = templateMap.get(template);

    if (existing) {
      existing.count++;
      existing.entryIds.push(entry.id);
      if (entry.riskScore > existing.maxRiskScore) {
        existing.maxRiskScore = entry.riskScore;
        existing.severity = entry.severity;
      }
      if (entry.timestamp) {
        if (!existing.firstSeen || entry.timestamp < existing.firstSeen) {
          existing.firstSeen = entry.timestamp;
        }
        if (!existing.lastSeen || entry.timestamp > existing.lastSeen) {
          existing.lastSeen = entry.timestamp;
        }
      }
      entryMap.set(entry.id, { ...entry, clusterId: existing.id });
    } else {
      const clusterId = `cluster-${templateMap.size + 1}`;
      const cluster: ErrorCluster = {
        id: clusterId,
        template,
        count: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        entryIds: [entry.id],
        maxRiskScore: entry.riskScore,
        severity: entry.severity,
      };
      templateMap.set(template, cluster);
      entryMap.set(entry.id, { ...entry, clusterId });
    }
  }

  // Only keep clusters with 2+ entries (actual repeats)
  const clusters = Array.from(templateMap.values())
    .filter(c => c.count >= 2)
    .sort((a, b) => b.maxRiskScore - a.maxRiskScore);

  // Re-assign clusterId only for actual clusters
  const clusteredIds = new Set(clusters.flatMap(c => c.entryIds));
  const finalEntries = entries.map(e => {
    const updated = entryMap.get(e.id) || e;
    if (updated.clusterId && !clusteredIds.has(e.id)) {
      return { ...updated, clusterId: undefined };
    }
    return updated;
  });

  return { entries: finalEntries, clusters };
}

function extractTemplate(message: string): string {
  let t = message;
  for (const [pattern, replacement] of VAR_PATTERNS) {
    t = t.replace(pattern, replacement);
  }
  return t.trim().toLowerCase().slice(0, 150);
}
