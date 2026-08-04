import React, { useState, useEffect } from 'react';
import { Clock, Search, Trash2, Download, ArrowLeft, Loader2, AlertOctagon } from 'lucide-react';
import { api } from '../api/client';
import type { SessionListItem, AnalysisResult } from '../types';

interface Props {
  onLoadSession: (result: AnalysisResult) => void;
  onBack: () => void;
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';
  return <span className={`font-bold text-sm ${color}`}>{score}%</span>;
}

export function SessionHistory({ onLoadSession, onBack }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sessions.list({ limit: 50, search: q });
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSessions(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const row = await api.sessions.get(id);
      onLoadSession(row.full_result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load session');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    setDeleting(id);
    try {
      await api.sessions.delete(id);
      setSessions(s => s.filter(x => x.id !== id));
      setTotal(t => t - 1);
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            Analysis History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{total} session{total !== 1 ? 's' : ''} stored</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename…"
          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
          <AlertOctagon size={14} /> {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p>No sessions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div
              key={s.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center gap-4 hover:border-slate-700 transition-colors group"
            >
              {/* Health */}
              <div className="text-center w-12 shrink-0">
                <HealthBadge score={s.health_score} />
                <div className="text-[10px] text-slate-600">health</div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-200 truncate">{s.filename}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-500 shrink-0">
                    {s.format.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{new Date(s.created_at).toLocaleString()}</span>
                  <span>{s.total_lines.toLocaleString()} lines</span>
                  {s.critical_count > 0 && (
                    <span className="text-red-400">{s.critical_count} critical</span>
                  )}
                  {s.high_count > 0 && (
                    <span className="text-orange-400">{s.high_count} high</span>
                  )}
                  {s.anomaly_count === 0 && (
                    <span className="text-emerald-500">Clean</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={api.export.url(s.id, 'json')}
                  download
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
                  title="Export JSON"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Delete"
                >
                  {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
                <button
                  onClick={() => handleLoad(s.id)}
                  disabled={loadingId === s.id}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium transition-colors flex items-center gap-1"
                >
                  {loadingId === s.id ? <Loader2 size={12} className="animate-spin" /> : null}
                  Load
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
