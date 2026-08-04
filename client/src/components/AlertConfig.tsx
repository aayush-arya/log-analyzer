import React, { useState, useEffect } from 'react';
import { Bell, X, Save, Loader2, TestTube, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import type { AlertConfig as AlertConfigType } from '../types';

interface Props {
  onClose: () => void;
}

export function AlertConfig({ onClose }: Props) {
  const [config, setConfig] = useState<AlertConfigType | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.alerts.getConfig().then(setConfig).catch(() => setError('Failed to load config'));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.alerts.updateConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.alerts.sendTest();
      setTestResult(r.message);
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 font-medium">
            <Bell size={15} className="text-indigo-400" />
            Alert Configuration
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm">
          {!config ? (
            <div className="text-center py-8 text-slate-500"><Loader2 size={20} className="animate-spin mx-auto" /></div>
          ) : (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <label className="text-slate-300">Enable Alerts</label>
                <button
                  onClick={() => setConfig(c => c ? { ...c, enabled: !c.enabled } : c)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${config.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Critical Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={config.critical_threshold}
                    onChange={e => setConfig(c => c ? { ...c, critical_threshold: parseInt(e.target.value, 10) } : c)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">High Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={config.high_threshold}
                    onChange={e => setConfig(c => c ? { ...c, high_threshold: parseInt(e.target.value, 10) } : c)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Webhook type */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Webhook Type</label>
                <select
                  value={config.webhook_type || 'slack'}
                  onChange={e => setConfig(c => c ? { ...c, webhook_type: e.target.value } : c)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="slack">Slack</option>
                  <option value="generic">Generic Webhook</option>
                </select>
              </div>

              {/* Webhook URL */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Webhook URL</label>
                <input
                  type="url"
                  value={config.webhook_url || ''}
                  onChange={e => setConfig(c => c ? { ...c, webhook_url: e.target.value || null } : c)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500 placeholder-slate-600 text-xs"
                />
              </div>

              {/* Error */}
              {error && <p className="text-xs text-red-400">{error}</p>}
              {testResult && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded border border-emerald-900">
                  <CheckCircle size={12} /> {testResult}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {config && (
          <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-800">
            <button
              onClick={handleTest}
              disabled={testing || !config.webhook_url}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md text-xs text-slate-300 transition-colors"
            >
              {testing ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
              Test
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-md text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
