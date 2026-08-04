import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { LogEntry, Severity } from '../types';

interface Props {
  entries: LogEntry[];
  onSelect: (entry: LogEntry) => void;
}

const ICON: Record<Severity, React.ReactNode> = {
  critical: <AlertOctagon size={13} className="text-red-400" />,
  high:     <AlertTriangle size={13} className="text-orange-400" />,
  medium:   <AlertTriangle size={13} className="text-yellow-400" />,
  low:      <Info size={13} className="text-blue-400" />,
  normal:   <Info size={13} className="text-slate-500" />,
};

const BAR: Record<Severity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
  normal:   'bg-slate-600',
};

const TEXT: Record<Severity, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
  normal:   'text-slate-400',
};

export function Timeline({ entries, onSelect }: Props) {
  const top = [...entries]
    .filter(e => e.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15);

  if (top.length === 0) {
    return (
      <div className="p-4 text-center text-slate-600 text-sm">No anomalies detected</div>
    );
  }

  const maxScore = top[0].riskScore;

  return (
    <div className="space-y-1 p-2">
      {top.map((entry, i) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry)}
          className="w-full text-left group hover:bg-slate-800/60 rounded-md p-2 transition-colors"
        >
          <div className="flex items-start gap-2">
            <span className="text-slate-600 text-xs w-5 shrink-0 pt-0.5">#{i + 1}</span>
            <span className="shrink-0 pt-0.5">{ICON[entry.severity]}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${TEXT[entry.severity]}`}>
                  Score: {entry.riskScore}
                </span>
                <span className="text-xs text-slate-600">Line {entry.lineNumber}</span>
                {entry.timestamp && (
                  <span className="text-xs text-slate-700 hidden sm:inline">
                    {entry.timestamp.replace('T', ' ').replace('Z', '').slice(0, 19)}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono truncate group-hover:text-slate-300">
                {entry.message}
              </div>
              {/* Score bar */}
              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR[entry.severity]}`}
                  style={{ width: `${(entry.riskScore / maxScore) * 100}%` }}
                />
              </div>
              {entry.anomalyReasons.length > 0 && (
                <div className="text-[10px] text-slate-600 truncate">
                  {entry.anomalyReasons.slice(0, 2).join(' · ')}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
