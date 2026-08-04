import React from 'react';
import { Zap, BarChart2, Tag } from 'lucide-react';
import type { PatternSummary as PatternSummaryType, Severity } from '../types';

interface Props {
  patterns: PatternSummaryType;
}

const SEV_TEXT: Record<Severity, string> = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400',
  low: 'text-blue-400', normal: 'text-slate-400',
};

const SEV_BG: Record<Severity, string> = {
  critical: 'bg-red-900/40 border-red-800', high: 'bg-orange-900/40 border-orange-800',
  medium: 'bg-yellow-900/40 border-yellow-800', low: 'bg-blue-900/40 border-blue-800',
  normal: 'bg-slate-800 border-slate-700',
};

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-16 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-slate-400 w-8 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: 'bg-red-500', FATAL: 'bg-red-600', CRITICAL: 'bg-red-500',
  WARN: 'bg-yellow-500', WARNING: 'bg-yellow-500',
  INFO: 'bg-blue-500', DEBUG: 'bg-slate-600',
  NOTICE: 'bg-emerald-500', ALERT: 'bg-red-400', EMERG: 'bg-red-700',
};

export function PatternSummary({ patterns }: Props) {
  const levelEntries = Object.entries(patterns.byLevel).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sourceEntries = Object.entries(patterns.bySource).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxLevel = Math.max(...levelEntries.map(e => e[1]), 1);
  const maxSource = Math.max(...sourceEntries.map(e => e[1]), 1);

  return (
    <div className="space-y-5 p-4">
      {/* Burst patterns */}
      {patterns.burstPatterns.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Zap size={12} />
            Burst / Attack Patterns
          </div>
          <div className="space-y-1.5">
            {patterns.burstPatterns.map((p, i) => (
              <div key={i} className={`text-xs px-3 py-2 rounded-md border ${SEV_BG[p.severity]}`}>
                <div className={`font-medium ${SEV_TEXT[p.severity]} mb-0.5`}>
                  {p.type.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-slate-400">{p.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By level */}
      {levelEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <BarChart2 size={12} />
            By Log Level
          </div>
          <div className="space-y-1.5">
            {levelEntries.map(([level, count]) => (
              <MiniBar
                key={level}
                label={level}
                value={count}
                max={maxLevel}
                color={LEVEL_COLORS[level.toUpperCase()] || 'bg-slate-500'}
              />
            ))}
          </div>
        </div>
      )}

      {/* By source */}
      {sourceEntries.length > 0 && sourceEntries.some(([s]) => s !== 'app' && s !== 'unknown') && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Tag size={12} />
            By Source / Service
          </div>
          <div className="space-y-1.5">
            {sourceEntries.map(([source, count]) => (
              <MiniBar key={source} label={source} value={count} max={maxSource} color="bg-indigo-500" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
