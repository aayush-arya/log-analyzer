import React from 'react';
import { Activity, Upload, Clock, Plus } from 'lucide-react';
import type { View } from '../App';

interface Props {
  view: View;
  hasResult: boolean;
  onNewAnalysis: () => void;
  onViewHistory: () => void;
  onViewDashboard: () => void;
}

export function Header({ view, hasResult, onNewAnalysis, onViewHistory, onViewDashboard }: Props) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <Activity size={15} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide">
            Log<span className="text-indigo-400">Analyzer</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 text-sm">
          <button
            onClick={onNewAnalysis}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              view === 'upload'
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Upload size={13} />
            Analyze
          </button>

          {hasResult && (
            <button
              onClick={onViewDashboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                view === 'dashboard'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity size={13} />
              Dashboard
            </button>
          )}

          <button
            onClick={onViewHistory}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              view === 'history'
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock size={13} />
            History
          </button>
        </nav>

        {/* New Analysis CTA */}
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={13} />
          New Analysis
        </button>
      </div>
    </header>
  );
}
