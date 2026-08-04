import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { SessionHistory } from './components/SessionHistory';
import type { AnalysisResult, FilterState } from './types';

export type View = 'upload' | 'dashboard' | 'history';

const defaultFilter: FilterState = { severity: 'all', search: '', showOnlyAnomalies: false };

export default function App() {
  const [view, setView] = useState<View>('upload');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = useCallback((r: AnalysisResult) => {
    setResult(r);
    setFilter(defaultFilter);
    setView('dashboard');
    setError(null);
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setView('upload');
    setResult(null);
    setFilter(defaultFilter);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        view={view}
        hasResult={!!result}
        onNewAnalysis={handleNewAnalysis}
        onViewHistory={() => setView('history')}
        onViewDashboard={() => result && setView('dashboard')}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'upload' && (
          <FileUpload
            onComplete={handleAnalysisComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
          />
        )}

        {view === 'dashboard' && result && (
          <Dashboard
            result={result}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}

        {view === 'history' && (
          <SessionHistory
            onLoadSession={handleAnalysisComplete}
            onBack={() => setView(result ? 'dashboard' : 'upload')}
          />
        )}
      </main>
    </div>
  );
}
