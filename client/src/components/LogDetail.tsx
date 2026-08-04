import React from 'react';
import { X, Clock, Hash, Code, AlertTriangle, Tag } from 'lucide-react';
import type { LogEntry, Severity } from '../types';

interface Props {
  entry: LogEntry;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<Severity, { badge: string; bar: string }> = {
  critical: { badge: 'bg-red-900/60 text-red-300 border border-red-800', bar: 'bg-red-500' },
  high:     { badge: 'bg-orange-900/60 text-orange-300 border border-orange-800', bar: 'bg-orange-500' },
  medium:   { badge: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800', bar: 'bg-yellow-500' },
  low:      { badge: 'bg-blue-900/60 text-blue-300 border border-blue-800', bar: 'bg-blue-500' },
  normal:   { badge: 'bg-slate-800 text-slate-400 border border-slate-700', bar: 'bg-slate-500' },
};

export function LogDetail({ entry, onClose }: Props) {
  const style = SEVERITY_STYLES[entry.severity];

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Line {entry.lineNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
            {entry.severity.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Risk score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Risk Score</span>
            <span className="font-bold text-slate-300">{entry.riskScore}/100</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${entry.riskScore}%` }}
            />
          </div>
        </div>

        {/* Timestamp */}
        {entry.timestamp && (
          <div className="flex items-start gap-2">
            <Clock size={13} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Timestamp</div>
              <div className="text-slate-300 font-mono text-xs">{entry.timestamp}</div>
            </div>
          </div>
        )}

        {/* Level & Source */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Tag size={13} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Level</div>
              <div className="text-slate-300 font-mono text-xs">{entry.level}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Hash size={13} className="text-slate-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Source</div>
              <div className="text-slate-300 font-mono text-xs">{entry.source}</div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Message</div>
          <div className="bg-slate-800 rounded-md p-3 text-slate-300 text-xs font-mono break-all leading-relaxed">
            {entry.message}
          </div>
        </div>

        {/* Raw line */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
            <Code size={11} />
            Raw Log Line
          </div>
          <div className="bg-slate-950 rounded-md p-3 text-slate-400 text-xs font-mono break-all leading-relaxed border border-slate-800">
            {entry.rawLine}
          </div>
        </div>

        {/* Anomaly reasons */}
        {entry.anomalyReasons.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
              <AlertTriangle size={11} />
              Detection Reasons
            </div>
            <ul className="space-y-1">
              {entry.anomalyReasons.map((r, i) => (
                <li key={i} className="text-xs text-amber-300 bg-amber-950/30 px-2.5 py-1 rounded border border-amber-900/50 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        {Object.keys(entry.metadata).length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5">Metadata</div>
            <div className="bg-slate-800 rounded-md p-3 space-y-1">
              {Object.entries(entry.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-slate-500 shrink-0">{k}:</span>
                  <span className="text-slate-300 font-mono break-all">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cluster info */}
        {entry.clusterId && (
          <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-2 rounded border border-slate-700">
            Part of error cluster <code className="text-slate-400">{entry.clusterId}</code>
          </div>
        )}
      </div>
    </div>
  );
}
