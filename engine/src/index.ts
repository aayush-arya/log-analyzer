import { v4 as uuidv4 } from 'uuid';
import { detectFormat, parseLine } from './parsers/index';
import { scoreEntry } from './scorer';
import { detectPatterns } from './patterns';
import { clusterEntries } from './clusterer';
import { AnalysisResult, LogEntry, AnalysisMetrics } from './types';

export * from './types';

export interface AnalyzeOptions {
  filename: string;
  sessionId?: string;
}

export function analyzeText(text: string, options: AnalyzeOptions): AnalysisResult {
  const sessionId = options.sessionId || uuidv4();
  const rawLines = text.split('\n');
  const lines = rawLines.map(l => l.trimEnd());
  const format = detectFormat(lines);
  const createdAt = new Date().toISOString();

  const rawEntries: LogEntry[] = lines
    .filter(l => l.trim().length > 0)
    .map((line, idx) => {
      const parsed = parseLine(line, idx + 1, format);
      const { score, reasons, severity } = scoreEntry(parsed);
      return {
        id: uuidv4(),
        ...parsed,
        riskScore: score,
        anomalyReasons: reasons,
        severity,
      };
    });

  const { entries, clusters } = clusterEntries(rawEntries);
  const patterns = detectPatterns(entries);
  const metrics = computeMetrics(entries, lines.length);

  return {
    sessionId,
    filename: options.filename,
    format,
    totalLines: lines.length,
    entries,
    clusters,
    patterns,
    metrics,
    createdAt,
  };
}

function computeMetrics(entries: LogEntry[], totalLines: number): AnalysisMetrics {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, normal: 0 };
  for (const e of entries) counts[e.severity]++;

  const anomalyCount = counts.critical + counts.high;
  const warningCount = counts.medium;
  const totalScored = entries.length || 1;
  const avgRisk = entries.reduce((sum, e) => sum + e.riskScore, 0) / totalScored;
  const healthScore = Math.max(0, Math.round(100 - avgRisk - anomalyCount * 2));

  return {
    totalLines,
    parsedLines: entries.length,
    anomalyCount,
    warningCount,
    healthScore: Math.min(100, healthScore),
    criticalCount: counts.critical,
    highCount: counts.high,
    mediumCount: counts.medium,
    lowCount: counts.low,
    normalCount: counts.normal,
  };
}
