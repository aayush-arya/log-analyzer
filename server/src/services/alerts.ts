import axios from 'axios';
import { queryOne } from '../db/index';
import type { AnalysisMetrics } from '@log-analyzer/engine';

interface AlertConfigRow {
  id: string;
  critical_threshold: number;
  high_threshold: number;
  enabled: boolean;
  webhook_url: string | null;
  webhook_type: string | null;
}

export async function checkAndFireAlerts(
  sessionId: string,
  filename: string,
  metrics: AnalysisMetrics,
): Promise<void> {
  const cfg = await queryOne<AlertConfigRow>('SELECT * FROM alert_configs LIMIT 1');
  if (!cfg || !cfg.enabled) return;

  const triggered: string[] = [];
  if (metrics.criticalCount >= cfg.critical_threshold) {
    triggered.push(`${metrics.criticalCount} CRITICAL anomalies (threshold: ${cfg.critical_threshold})`);
  }
  if (metrics.highCount >= cfg.high_threshold) {
    triggered.push(`${metrics.highCount} HIGH anomalies (threshold: ${cfg.high_threshold})`);
  }

  if (triggered.length === 0 || !cfg.webhook_url) return;

  const message = [
    `🚨 *Log Analyzer Alert*`,
    `File: \`${filename}\``,
    `Session: \`${sessionId}\``,
    `Health Score: ${metrics.healthScore}%`,
    '',
    'Triggers:',
    ...triggered.map(t => `• ${t}`),
  ].join('\n');

  try {
    if (cfg.webhook_type === 'slack') {
      await axios.post(cfg.webhook_url, { text: message });
    } else {
      await axios.post(cfg.webhook_url, {
        event: 'log_alert', sessionId, filename, metrics, triggers: triggered,
        timestamp: new Date().toISOString(),
      });
    }
    console.log(`Alert fired for session ${sessionId}`);
  } catch (err) {
    console.error('Failed to send alert webhook:', err);
  }
}
