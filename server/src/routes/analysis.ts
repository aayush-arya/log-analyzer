import { Router, Request, Response, NextFunction } from 'express';
import { streamAnalysis } from '../services/claude';
import { getCachedSession } from '../services/redis';
import { queryOne, query } from '../db/index';
import type { AnalysisResult } from '@log-analyzer/engine';

export const analysisRouter = Router();

interface SessionRow {
  id: string;
  full_result: AnalysisResult;
  ai_analysis: Record<string, unknown> | null;
}

async function getSession(sessionId: string): Promise<AnalysisResult | null> {
  // Try Redis cache first
  const cached = await getCachedSession<AnalysisResult>(sessionId);
  if (cached) return cached;

  // Fallback to PostgreSQL
  const row = await queryOne<SessionRow>(
    'SELECT id, full_result, ai_analysis FROM sessions WHERE id = $1',
    [sessionId],
  );
  return row ? row.full_result : null;
}

// GET /api/analysis/:sessionId — get full analysis result
analysisRouter.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getSession(req.params.sessionId);
    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/analysis/:sessionId/stream — SSE stream of Claude analysis
analysisRouter.get('/:sessionId/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getSession(req.params.sessionId);
    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Stream Claude's analysis and get the parsed result back
    const analysis = await streamAnalysis(result, res);

    // Persist AI analysis to DB (best-effort, response is already sent)
    if (analysis) {
      query(
        'UPDATE sessions SET ai_analysis = $1 WHERE id = $2',
        [JSON.stringify(analysis), req.params.sessionId],
      ).catch(err => console.warn('Failed to save AI analysis:', err));
    }
  } catch (err) {
    // If headers already sent (SSE started), we can't send an HTTP error
    if (!res.headersSent) {
      next(err);
    } else {
      console.error('SSE stream error after headers sent:', err);
    }
  }
});
