import React, { useState } from 'react';
import {
  Brain, Bell, Download, List, Clock, BarChart2,
  ChevronRight, ChevronLeft, Layers
} from 'lucide-react';
import { MetricsRow } from './MetricsRow';
import { LogTable } from './LogTable';
import { LogDetail } from './LogDetail';
import { Timeline } from './Timeline';
import { PatternSummary } from './PatternSummary';
import { AIAnalysis } from './AIAnalysis';
import { AlertConfig } from './AlertConfig';
import { api } from '../api/client';
import type { AnalysisResult, LogEntry, FilterState } from '../types';

interface Props {
  result: AnalysisResult;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
}

type RightPanel = 'timeline' | 'patterns' | 'ai' | 'detail';
type LeftPanel = 'none' | 'detail';

export function Dashboard({ result, filter, onFilterChange }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>('timeline');
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSelectEntry = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setRightPanel('detail');
  };

  const handleCloseDetail = () => {
    setSelectedEntry(null);
    setRightPanel('timeline');
  };

  const RIGHT_TABS: Array<{ id: RightPanel; icon: React.ReactNode; label: string; show?: boolean }> = [
    { id: 'timeline', icon: <Clock size={13} />, label: 'Timeline' },
    { id: 'patterns', icon: <BarChart2 size={13} />, label: 'Patterns' },
    { id: 'ai', icon: <Brain size={13} />, label: 'AI Analysis' },
    { id: 'detail', icon: <Layers size={13} />, label: 'Detail', show: !!selectedEntry },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <MetricsRow
              metrics={result.metrics}
              filename={result.filename}
              format={result.format}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAlertConfig(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-slate-300 transition-colors"
            >
              <Bell size={12} />
              Alerts
            </button>

            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs text-slate-300 transition-colors">
                <Download size={12} />
                Export
                <ChevronRight size={11} className="rotate-90" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 hidden group-hover:block z-20">
                <a
                  href={api.export.url(result.sessionId, 'pdf')}
                  download
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Export PDF
                </a>
                <a
                  href={api.export.url(result.sessionId, 'json')}
                  download
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Export JSON
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: log table + right panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Log table */}
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${sidebarOpen ? 'flex-1' : 'flex-1'}`}>
          <LogTable
            entries={result.entries}
            filter={filter}
            onFilterChange={onFilterChange}
            selectedId={selectedEntry?.id ?? null}
            onSelect={handleSelectEntry}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-80 xl:w-96 shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800 bg-slate-900">
            {RIGHT_TABS.filter(t => t.show !== false).map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanel(tab.id)}
                className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  rightPanel === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {rightPanel === 'timeline' && (
              <Timeline entries={result.entries} onSelect={handleSelectEntry} />
            )}
            {rightPanel === 'patterns' && (
              <PatternSummary patterns={result.patterns} />
            )}
            {rightPanel === 'ai' && (
              <AIAnalysis sessionId={result.sessionId} />
            )}
            {rightPanel === 'detail' && selectedEntry && (
              <LogDetail entry={selectedEntry} onClose={handleCloseDetail} />
            )}
            {rightPanel === 'detail' && !selectedEntry && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-sm gap-2">
                <List size={24} className="opacity-30" />
                <p>Click a log line to see details</p>
              </div>
            )}
          </div>

          {/* Error clusters summary */}
          {result.clusters.length > 0 && rightPanel !== 'detail' && (
            <div className="border-t border-slate-800 p-3">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Layers size={11} />
                Error Clusters ({result.clusters.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.clusters.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs px-2 py-1 bg-slate-800 rounded">
                    <span className="text-slate-400 truncate max-w-[180px]" title={c.template}>
                      {c.template.slice(0, 40)}…
                    </span>
                    <span className="text-slate-500 shrink-0 ml-2">×{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert config modal */}
      {showAlertConfig && <AlertConfig onClose={() => setShowAlertConfig(false)} />}
    </div>
  );
}
