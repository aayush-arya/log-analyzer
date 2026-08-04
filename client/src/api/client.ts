import type { AnalysisResult, AlertConfig, SessionListItem } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  ingest: {
    uploadFile: (file: File): Promise<AnalysisResult> => {
      const form = new FormData();
      form.append('file', file);
      return request<AnalysisResult>('/ingest', { method: 'POST', body: form });
    },
    uploadText: (text: string, filename: string): Promise<AnalysisResult> =>
      request<AnalysisResult>('/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename }),
      }),
  },

  sessions: {
    list: (params?: { limit?: number; offset?: number; search?: string }): Promise<{ sessions: SessionListItem[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.search) q.set('search', params.search);
      return request(`/sessions?${q}`);
    },
    get: (id: string): Promise<SessionListItem & { full_result: AnalysisResult }> =>
      request(`/sessions/${id}`),
    delete: (id: string): Promise<void> =>
      request(`/sessions/${id}`, { method: 'DELETE' }),
    search: (term: string): Promise<{ results: SessionListItem[] }> =>
      request(`/sessions/search/${encodeURIComponent(term)}`),
  },

  analysis: {
    get: (sessionId: string): Promise<AnalysisResult> =>
      request(`/analysis/${sessionId}`),
    streamUrl: (sessionId: string): string => `${BASE}/analysis/${sessionId}/stream`,
  },

  alerts: {
    getConfig: (): Promise<AlertConfig> => request('/alerts/config'),
    updateConfig: (cfg: Partial<AlertConfig>): Promise<AlertConfig> =>
      request('/alerts/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      }),
    sendTest: (): Promise<{ success: boolean; message: string }> =>
      request('/alerts/test', { method: 'POST' }),
  },

  export: {
    url: (sessionId: string, format: 'pdf' | 'json'): string =>
      `${BASE}/export/${sessionId}?format=${format}`,
  },
};
