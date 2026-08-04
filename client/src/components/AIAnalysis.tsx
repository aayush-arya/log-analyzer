import React, { useState, useRef, useEffect } from 'react';
import { Brain, Loader2, ChevronRight, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { AIAnalysis as AIAnalysisType, Severity } from '../types';

interface Props {
  sessionId: string;
}

const RISK_STYLES: Record<Severity, { badge: string; label: string }> = {
  critical: { badge: 'bg-red-900 text-red-300 border border-red-700', label: 'CRITICAL RISK' },
  high:     { badge: 'bg-orange-900 text-orange-300 border border-orange-700', label: 'HIGH RISK' },
  medium:   { badge: 'bg-yellow-900 text-yellow-300 border border-yellow-700', label: 'MEDIUM RISK' },
  low:      { badge: 'bg-blue-900 text-blue-300 border border-blue-700', label: 'LOW RISK' },
  normal:   { badge: 'bg-slate-800 text-slate-400 border border-slate-700', label: 'NORMAL' },
};

export function AIAnalysis({ sessionId }: Props) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysisType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamText]);

  useEffect(() => () => { esRef.current?.close(); }, []);

  const startAnalysis = () => {
    if (isStreaming) return;
    setStarted(true);
    setIsStreaming(true);
    setStreamText('');
    setAnalysis(null);
    setError(null);

    const es = new EventSource(api.analysis.streamUrl(sessionId));
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; text?: string; analysis?: AIAnalysisType; message?: string };
        if (data.type === 'text' && data.text) {
          setStreamText(prev => prev + data.text);
        } else if (data.type === 'done') {
          if (data.analysis) setAnalysis(data.analysis);
          setIsStreaming(false);
          es.close();
        } else if (data.type === 'error') {
          setError(data.message || 'Analysis failed');
          setIsStreaming(false);
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError('Connection to AI service failed. Check your ANTHROPIC_API_KEY.');
      setIsStreaming(false);
      es.close();
    };
  };

  const reset = () => {
    esRef.current?.close();
    setStarted(false);
    setStreamText('');
    setAnalysis(null);
    setError(null);
    setIsStreaming(false);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-900/50 border border-indigo-700 flex items-center justify-center">
          <Brain size={20} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm text-slate-300 font-medium">AI-Powered Analysis</p>
          <p className="text-xs text-slate-500 mt-1">Claude will analyze flagged entries and provide root cause analysis</p>
        </div>
        <button
          onClick={startAnalysis}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Brain size={14} />
          Run AI Analysis
          <ChevronRight size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Brain size={14} className="text-indigo-400" />
          <span>Claude Analysis</span>
          {isStreaming && <Loader2 size={12} className="animate-spin text-indigo-400" />}
          {analysis && <CheckCircle size={12} className="text-emerald-400" />}
        </div>
        {!isStreaming && (
          <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors">
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Parsed analysis (structured) */}
      {analysis ? (
        <div className="space-y-3 text-xs overflow-y-auto flex-1">
          {/* Risk level */}
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${RISK_STYLES[analysis.riskLevel]?.badge || ''}`}>
            {RISK_STYLES[analysis.riskLevel]?.label}
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div>
              <div className="text-slate-500 font-medium mb-1 uppercase tracking-wide text-[10px]">Summary</div>
              <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Top anomalies */}
          {analysis.topAnomalies?.length > 0 && (
            <div>
              <div className="text-slate-500 font-medium mb-1.5 uppercase tracking-wide text-[10px]">Top Anomalies</div>
              <ol className="space-y-1">
                {analysis.topAnomalies.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-400 shrink-0">{i + 1}.</span>
                    <span className="text-slate-300">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Root cause */}
          {analysis.rootCause && (
            <div>
              <div className="text-slate-500 font-medium mb-1 uppercase tracking-wide text-[10px]">Root Cause</div>
              <p className="text-slate-300 leading-relaxed">{analysis.rootCause}</p>
            </div>
          )}

          {/* Actions */}
          {analysis.immediateActions?.length > 0 && (
            <div>
              <div className="text-slate-500 font-medium mb-1.5 uppercase tracking-wide text-[10px]">Immediate Actions</div>
              <ol className="space-y-1">
                {analysis.immediateActions.map((a, i) => (
                  <li key={i} className="flex gap-2 bg-slate-800/50 px-2.5 py-1.5 rounded border border-slate-700">
                    <span className="text-emerald-400 shrink-0">{i + 1}.</span>
                    <span className="text-slate-300">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        /* Streaming text */
        <div
          ref={textRef}
          className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap"
        >
          {streamText}
          {isStreaming && <span className="cursor-blink text-indigo-400">▋</span>}
        </div>
      )}
    </div>
  );
}
