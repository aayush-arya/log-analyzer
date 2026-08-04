import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../db/index';
import { invalidateSession } from '../services/redis';
import type { AnalysisResult } from '@log-analyzer/engine';

export const sessionsRouter = Router();

interface SessionListRow {
  id: string;
  filename: string;
  format: string;
  created_at: string;
  total_lines: number;
  anomaly_count: number;
  warning_count: number;
  health_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  ai_analysis: Record<string, unknown> | null;
}

interface SessionFullRow extends SessionListRow {
  full_result: AnalysisResult;
}

// GET /api/sessions
sessionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const search = req.query.search as string | undefined;

    const params: unknown[] = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = ` WHERE filename LIKE $${params.length}`;
    }

    const rows = await query<SessionListRow>(
      `SELECT id, filename, format, created_at, total_lines, anomaly_count,
              warning_count, health_score, critical_count, high_count, medium_count, ai_analysis
       FROM sessions${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const countRow = await queryOne<{ 'COUNT(*)': number }>(
      `SELECT COUNT(*) FROM sessions${where}`,
      search ? [`%${search}%`] : [],
    );
    const total = Number(countRow?.['COUNT(*)'] ?? 0);

    res.json({ sessions: rows, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id
sessionsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await queryOne<SessionFullRow>(
      'SELECT * FROM sessions WHERE id = $1',
      [req.params.id],
    );
    if (!row) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sessions/:id
sessionsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await queryOne('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Session not found' }); return; }
    await query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    await invalidateSession(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/search/:term — search filenames
sessionsRouter.get('/search/:term', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = req.params.term;
    const rows = await query<SessionListRow>(
      `SELECT id, filename, format, created_at, total_lines, anomaly_count,
              warning_count, health_score, critical_count, high_count, medium_count
       FROM sessions
       WHERE filename LIKE $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${term}%`],
    );
    res.json({ results: rows, term });
  } catch (err) {
    next(err);
  }
});
