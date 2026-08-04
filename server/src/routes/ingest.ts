import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { analyzeText } from '@log-analyzer/engine';
import { upload } from '../middleware/upload';
import { query } from '../db/index';
import { cacheSession } from '../services/redis';
import { checkAndFireAlerts } from '../services/alerts';
import { config } from '../config';

export const ingestRouter = Router();

// POST /api/ingest — file upload (multipart/form-data)
ingestRouter.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let text: string;
      let filename: string;

      if (req.file) {
        // File upload path
        const filePath = path.join(config.uploadsDir, req.file.filename);
        text = fs.readFileSync(filePath, 'utf8');
        filename = req.file.originalname;
        // Clean up uploaded file after reading
        fs.unlink(filePath, () => undefined);
      } else if (req.body?.text) {
        // Raw text paste
        text = req.body.text as string;
        filename = (req.body.filename as string) || 'pasted-log.txt';
      } else {
        res.status(400).json({ error: 'Provide a file upload or text body' });
        return;
      }

      if (text.length > 50 * 1024 * 1024) {
        res.status(413).json({ error: 'Log content exceeds 50MB limit' });
        return;
      }

      const result = analyzeText(text, { filename });

      // Persist to PostgreSQL
      await query(
        `INSERT INTO sessions
           (id, filename, format, total_lines, anomaly_count, warning_count,
            health_score, critical_count, high_count, medium_count, full_result)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          result.sessionId,
          result.filename,
          result.format,
          result.metrics.totalLines,
          result.metrics.anomalyCount,
          result.metrics.warningCount,
          result.metrics.healthScore,
          result.metrics.criticalCount,
          result.metrics.highCount,
          result.metrics.mediumCount,
          JSON.stringify(result),
        ],
      );

      // Cache in Redis
      await cacheSession(result.sessionId, result);

      // Fire alerts if thresholds exceeded
      await checkAndFireAlerts(result.sessionId, result.filename, result.metrics);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/ingest/raw — JSON body for external services
ingestRouter.post('/raw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, filename = 'api-ingest.log' } = req.body as { text?: string; filename?: string };
    if (!text) {
      res.status(400).json({ error: 'Field "text" is required' });
      return;
    }

    const result = analyzeText(text, { filename });

    await query(
      `INSERT INTO sessions
         (id, filename, format, total_lines, anomaly_count, warning_count,
          health_score, critical_count, high_count, medium_count, full_result)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        result.sessionId, result.filename, result.format,
        result.metrics.totalLines, result.metrics.anomalyCount, result.metrics.warningCount,
        result.metrics.healthScore, result.metrics.criticalCount, result.metrics.highCount,
        result.metrics.mediumCount, JSON.stringify(result),
      ],
    );

    await cacheSession(result.sessionId, result);
    await checkAndFireAlerts(result.sessionId, result.filename, result.metrics);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
