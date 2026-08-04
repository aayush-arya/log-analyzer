import React, { useMemo, useState, useCallback } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import type { LogEntry, Severity, FilterState } from '../types';

interface Props {
  entries: LogEntry[];
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  selectedId: string | null;
  onSelect: (entry: LogEntry) => void;
}

const SEV_ROW: Record<Severity, string> = {
  critical: 'bg-red-950/30 border-l-2 border-l-red-600 hover:bg-red-950/50',
  high:     'bg-orange-950/20 border-l-2 border-l-orange-600 hover:bg-orange-950/40',
  medium:   'bg-yellow-950/10 border-l-2 border-l-yellow-600 hover:bg-yellow-950/30',
  low:      'border-l-2 border-l-blue-800 hover:bg-slate-800/50',
  normal:   'border-l-2 border-l-transparent hover:bg-slate-800/30',
};

const SEV_BADGE: Record<Severity, string> = {
  critical: 'bg-red-900 text-red-300',
  high:     'bg-orange-900 text-orange-300',
  medium:   'bg-yellow-900 text-yellow-300',
  low:      'bg-blue-900 text-blue-300',
  normal:   'bg-slate-800 text-slate-500',
};

const SEV_BAR: Record<Severity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
  normal:   'bg-slate-600',
};

const SEVERITY_OPTIONS: Array<{ value: FilterState['severity']; label: string }> = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
];

const PAGE_SIZE = 200;

export function LogTable({ entries, filter, onFilterChange, selectedId, onSelect }: Props) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = entries;
    if (filter.showOnlyAnomalies) {
      list = list.filter(e => e.severity === 'critical' || e.severity === 'high' || e.severity === 'medium');
    }
    if (filter.severity !== 'all') {
      list = list.filter(e => e.severity === filter.severity);
    }
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      list = list.filter(e =>
        e.message.toLowerCase().includes(q) ||
        e.rawLine.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        (e.level || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filter]);

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, search: e.target.value });
    setPage(0);
  }, [filter, onFilterChange]);

  const handleSeverity = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filter, severity: e.target.value as FilterState['severity'] });
    setPage(0);
  }, [filter, onFilterChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-900/80">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filter.search}
            onChange={handleSearch}
            placeholder="Filter logs…"
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
          />
        </div>

        <div className="relative">
          <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={filter.severity}
            onChange={handleSeverity}
            className="pl-7 pr-6 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            {SEVERITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>

        <button
          onClick={() => { onFilterChange({ ...filter, showOnlyAnomalies: !filter.showOnlyAnomalies }); setPage(0); }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            filter.showOnlyAnomalies ? 'bg-orange-900 text-orange-300' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Anomalies only
        </button>

        <span className="ml-auto text-xs text-slate-600">
          {filtered.length.toLocaleString()} / {entries.length.toLocaleString()} lines
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr className="text-slate-500 text-left border-b border-slate-800">
              <th className="px-3 py-2 w-14 font-medium">#</th>
              <th className="px-3 py-2 w-24 font-medium">Severity</th>
              <th className="px-3 py-2 w-16 font-medium">Score</th>
              <th className="px-3 py-2 w-36 font-medium hidden md:table-cell">Timestamp</th>
              <th className="px-3 py-2 w-20 font-medium hidden lg:table-cell">Source</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(entry => (
              <tr
                key={entry.id}
                onClick={() => onSelect(entry)}
                className={`cursor-pointer transition-colors ${SEV_ROW[entry.severity]} ${
                  selectedId === entry.id ? 'ring-1 ring-inset ring-indigo-500' : ''
                }`}
              >
                <td className="px-3 py-1.5 text-slate-600 select-none">{entry.lineNumber}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${SEV_BADGE[entry.severity]}`}>
                    {entry.severity}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SEV_BAR[entry.severity]}`}
                        style={{ width: `${entry.riskScore}%` }}
                      />
                    </div>
                    <span className="text-slate-500 text-[10px]">{entry.riskScore}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500 hidden md:table-cell truncate max-w-[9rem]">
                  {entry.timestamp ? entry.timestamp.replace('T', ' ').replace('Z', '').slice(0, 19) : '—'}
                </td>
                <td className="px-3 py-1.5 text-slate-500 hidden lg:table-cell truncate max-w-[5rem]">{entry.source}</td>
                <td className="px-3 py-1.5 text-slate-300 max-w-0">
                  <div className="truncate">{entry.message}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginated.length === 0 && (
          <div className="py-16 text-center text-slate-600 text-sm">No entries match the current filter</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-2 border-t border-slate-800 text-xs text-slate-500">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 rounded hover:bg-slate-800 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
