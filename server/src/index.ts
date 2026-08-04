import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { runMigrations } from './db/migrations';
import { ingestRouter } from './routes/ingest';
import { analysisRouter } from './routes/analysis';
import { sessionsRouter } from './routes/sessions';
import { alertsRouter } from './routes/alerts';
import { exportRouter } from './routes/export';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// Ensure uploads directory exists
fs.mkdirSync(config.uploadsDir, { recursive: true });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const ingestLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Too many requests' });

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/ingest', ingestLimiter, ingestRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/export', exportRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0', db: 'sqlite' }));

// Serve static frontend in production
if (config.nodeEnv === 'production') {
  const clientBuild = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
  }
}

app.use(notFound);
app.use(errorHandler);

async function main() {
  await runMigrations();
  app.listen(config.port, () => {
    console.log(`\n🚀  Log Analyzer server  →  http://localhost:${config.port}`);
    console.log(`    DB:     SQLite (./data/log-analyzer.db)`);
    console.log(`    Model:  ${config.claudeModel}`);
    console.log(`    Env:    ${config.nodeEnv}\n`);
  });
}

main().catch(err => { console.error('Startup failed:', err); process.exit(1); });
