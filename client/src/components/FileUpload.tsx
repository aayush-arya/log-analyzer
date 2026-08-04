import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import type { AnalysisResult } from '../types';

interface Props {
  onComplete: (result: AnalysisResult) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
}

const SAMPLE_FORMATS = [
  { label: 'Apache / Nginx', ext: '.log' },
  { label: 'Syslog / journald', ext: '.log' },
  { label: 'JSON structured', ext: '.json' },
  { label: 'Kubernetes', ext: '.log' },
];

export function FileUpload({ onComplete, isLoading, setIsLoading, error, setError }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [pastedFilename, setPastedFilename] = useState('pasted-log.txt');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.ingest.uploadFile(file);
      onComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  }, [onComplete, setIsLoading, setError]);

  const handleText = useCallback(async () => {
    if (!pastedText.trim()) { setError('Please paste some log content'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.ingest.uploadText(pastedText, pastedFilename);
      onComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [pastedText, pastedFilename, onComplete, setIsLoading, setError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-6">
      <div className="w-full max-w-2xl space-y-6 animate-in">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Log Analysis & Anomaly Detection</h1>
          <p className="text-slate-400 text-sm">
            Upload a log file or paste raw log content — powered by Claude AI
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
          <button
            onClick={() => setMode('file')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'file' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'paste' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Text
          </button>
        </div>

        {/* File upload zone */}
        {mode === 'file' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".log,.txt,.json,.gz"
              className="hidden"
              onChange={onFileChange}
              disabled={isLoading}
            />
            {isLoading ? (
              <Loader2 size={40} className="text-indigo-400 animate-spin" />
            ) : (
              <Upload size={40} className={isDragging ? 'text-indigo-400' : 'text-slate-500'} />
            )}
            <div className="text-center">
              <p className="font-medium text-slate-300">
                {isLoading ? 'Analyzing logs…' : 'Drop your log file here'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                or click to browse — .log, .txt, .json up to 50 MB
              </p>
            </div>

            {/* Format badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {SAMPLE_FORMATS.map(f => (
                <span key={f.label} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400 font-mono">
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Paste text zone */}
        {mode === 'paste' && (
          <div className="space-y-3">
            <input
              type="text"
              value={pastedFilename}
              onChange={e => setPastedFilename(e.target.value)}
              placeholder="Filename (optional)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste your log content here…"
              rows={14}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={handleText}
              disabled={isLoading || !pastedText.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
              ) : (
                <><FileText size={15} /> Analyze Logs <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Sample files hint */}
        <p className="text-center text-xs text-slate-600">
          Don't have a log file? Try the sample files in the <code className="text-slate-500">/samples</code> directory.
        </p>
      </div>
    </div>
  );
}
