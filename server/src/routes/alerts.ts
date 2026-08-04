import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { query, queryOne } from '../db/index';

export const alertsRouter = Router();

interface AlertConfigRow {
  id: string;
  critical_threshold: number;
  high_threshold: number;
  enabled: boolean;
  webhook_url: string | null;
  webhook_type: string | null;
  email_recipient: string | null;
}

// GET /api/alerts/config
alertsRouter.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await queryOne<AlertConfigRow>('SELECT * FROM alert_configs LIMIT 1');
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/config
alertsRouter.put('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { critical_threshold, high_threshold, enabled, webhook_url, webhook_type, email_recipient }
      = req.body as Partial<AlertConfigRow>;

    const existing = await queryOne<AlertConfigRow>('SELECT id FROM alert_configs LIMIT 1');

    if (existing) {
      await query(
        `UPDATE alert_configs SET
           critical_threshold = COALESCE($1, critical_threshold),
           high_threshold     = COALESCE($2, high_threshold),
           enabled            = COALESCE($3, enabled),
           webhook_url        = $4,
           webhook_type       = COALESCE($5, webhook_type),
           email_recipient    = $6,
           updated_at         = datetime('now')
         WHERE id = $7`,
        [
          critical_threshold ?? null,
          high_threshold ?? null,
          enabled !== undefined ? (enabled ? 1 : 0) : null,
          webhook_url ?? null,
          webhook_type ?? null,
          email_recipient ?? null,
          existing.id,
        ],
      );
    } else {
      await query(
        `INSERT INTO alert_configs (id, critical_threshold, high_threshold, enabled, webhook_url, webhook_type, email_recipient)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), critical_threshold ?? 5, high_threshold ?? 10, enabled !== false ? 1 : 0, webhook_url ?? null, webhook_type ?? 'slack', email_recipient ?? null],
      );
    }

    const updated = await queryOne<AlertConfigRow>('SELECT * FROM alert_configs LIMIT 1');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/test
alertsRouter.post('/test', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = await queryOne<AlertConfigRow>('SELECT * FROM alert_configs LIMIT 1');
    if (!cfg?.webhook_url) {
      res.status(400).json({ error: 'No webhook URL configured' });
      return;
    }

    const testPayload = cfg.webhook_type === 'slack'
      ? { text: '✅ *Log Analyzer* — Test alert. Webhook is working!' }
      : { event: 'test', message: 'Test alert from Log Analyzer', timestamp: new Date().toISOString() };

    await axios.post(cfg.webhook_url, testPayload);
    res.json({ success: true, message: 'Test alert sent' });
  } catch (err) {
    next(err);
  }
});
