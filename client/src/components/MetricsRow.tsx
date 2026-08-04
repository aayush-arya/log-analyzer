import React from 'react';
import { AlertTriangle, AlertOctagon, Activity, Shield, FileText, Info } from 'lucide-react';
import type { AnalysisMetrics, LogFormat } from '../types';

interface Props {
  metrics: AnalysisMetrics;
  filename: string;
  format: LogFormat;
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  const label = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Health</span>
        <span className={`text-sm font-bold ${label}`}>{score}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

function MetricCard({ label, value, icon, color, bg, border }: MetricCardProps) {
  return (
    <div className={`rounded-lg p-4 border ${bg} ${border} space-y-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

export function MetricsRow({ metrics, filename, format }: Props) {
  return (
    <div className="space-y-3">
      {/* File info bar */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <FileText size={13} />
        <span className="text-slate-300 font-medium truncate max-w-xs">{filename}</span>
        <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-400">{format.toUpperCase()}</span>
        <span>{metrics.totalLines.toLocaleString()} lines</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 md:col-span-1 rounded-lg p-4 border bg-slate-900 border-slate-700 space-y-2">
          <HealthBar score={metrics.healthScore} />
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Activity size={11} />
            <span>{metrics.parsedLines.toLocaleString()} parsed</span>
          </div>
        </div>

        <MetricCard
          label="Critical"
          value={metrics.criticalCount}
          icon={<AlertOctagon size={14} />}
          color={metrics.criticalCount > 0 ? 'text-red-400' : 'text-slate-500'}
          bg={metrics.criticalCount > 0 ? 'bg-red-950/40' : 'bg-slate-900'}
          border={metrics.criticalCount > 0 ? 'border-red-900' : 'border-slate-700'}
        />
        <MetricCard
          label="High"
          value={metrics.highCount}
          icon={<AlertTriangle size={14} />}
          color={metrics.highCount > 0 ? 'text-orange-400' : 'text-slate-500'}
          bg={metrics.highCount > 0 ? 'bg-orange-950/40' : 'bg-slate-900'}
          border={metrics.highCount > 0 ? 'border-orange-900' : 'border-slate-700'}
        />
        <MetricCard
          label="Warnings"
          value={metrics.mediumCount}
          icon={<Shield size={14} />}
          color={metrics.mediumCount > 0 ? 'text-yellow-400' : 'text-slate-500'}
          bg={metrics.mediumCount > 0 ? 'bg-yellow-950/40' : 'bg-slate-900'}
          border={metrics.mediumCount > 0 ? 'border-yellow-900' : 'border-slate-700'}
        />
        <MetricCard
          label="Anomalies"
          value={metrics.anomalyCount}
          icon={<AlertTriangle size={14} />}
          color={metrics.anomalyCount > 0 ? 'text-orange-300' : 'text-slate-500'}
          bg="bg-slate-900"
          border="border-slate-700"
        />
        <MetricCard
          label="Normal"
          value={metrics.normalCount + metrics.lowCount}
          icon={<Info size={14} />}
          color="text-slate-400"
          bg="bg-slate-900"
          border="border-slate-700"
        />
      </div>
    </div>
  );
}
