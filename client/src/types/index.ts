export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'normal';
export type LogFormat = 'apache' | 'nginx' | 'syslog' | 'json' | 'kubernetes' | 'generic';

export interface LogEntry {
  id: string;
  lineNumber: number;
  timestamp: string | null;
  level: string;
  severity: Severity;
  message: string;
  source: string;
  rawLine: string;
  riskScore: number;
  anomalyReasons: string[];
  clusterId?: string;
  metadata: Record<string, unknown>;
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

export interface AIAnalysis {
  summary: string;
  topAnomalies: string[];
  rootCause: string;
  immediateActions: string[];
  riskLevel: Severity;
  confidence: number;
}

export interface AlertConfig {
  id: string;
  critical_threshold: number;
  high_threshold: number;
  enabled: boolean;
  webhook_url: string | null;
  webhook_type: string | null;
  email_recipient: string | null;
}

export interface SessionListItem {
  id: string;
  filename: string;
  format: LogFormat;
  created_at: string;
  total_lines: number;
  anomaly_count: number;
  warning_count: number;
  health_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  ai_analysis: AIAnalysis | null;
}

export type FilterSeverity = Severity | 'all';

export interface FilterState {
  severity: FilterSeverity;
  search: string;
  showOnlyAnomalies: boolean;
}
