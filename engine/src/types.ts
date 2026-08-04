export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'normal';
export type LogFormat = 'apache' | 'nginx' | 'syslog' | 'json' | 'kubernetes' | 'generic';

export interface ParsedEntry {
  lineNumber: number;
  timestamp: string | null;
  level: string;
  message: string;
  source: string;
  rawLine: string;
  metadata: Record<string, unknown>;
}

export interface LogEntry extends ParsedEntry {
  id: string;
  severity: Severity;
  riskScore: number;
  anomalyReasons: string[];
  clusterId?: string;
}

export interface ErrorCluster {
  id: string;
  template: string;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  entryIds: string[];
  maxRiskScore: number;
  severity: Severity;
}

export interface BurstPattern {
  type: string;
  count: number;
  timeWindowSeconds: number;
  description: string;
  severity: Severity;
}

export interface PatternSummary {
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  burstPatterns: BurstPattern[];
}

export interface AnalysisMetrics {
  totalLines: number;
  parsedLines: number;
  anomalyCount: number;
  warningCount: number;
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  normalCount: number;
}

export interface AnalysisResult {
  sessionId: string;
  filename: string;
  format: LogFormat;
  totalLines: number;
  entries: LogEntry[];
  clusters: ErrorCluster[];
  patterns: PatternSummary;
  metrics: AnalysisMetrics;
  createdAt: string;
}
