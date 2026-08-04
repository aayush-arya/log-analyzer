# Log Analyzer — AI-Powered Anomaly Detection

A production-ready full-stack application for log analysis and anomaly detection, powered by Claude AI.

## Features

- **Multi-format parsing**: Apache/Nginx, syslog, JSON structured logs, Kubernetes logs
- **Rule-based scoring**: Each log line gets a risk score (0–100) and severity (critical/high/medium/low/normal)
- **Burst detection**: Identifies brute force attacks, error spikes, crash loops, timeout storms
- **Error clustering**: Groups repeated errors to reduce noise
- **AI analysis**: Claude streams a structured report with root cause, anomalies, and immediate actions
- **Dark UI**: Monospace log viewer with color-coded severity rows and risk score bars
- **Session history**: PostgreSQL-backed storage with search and comparison
- **Export**: PDF and JSON report export
- **Alerts**: Configurable Slack/webhook notifications on threshold breach

## Quick Start

### Docker (recommended)

```bash
git clone <repo>
cd log-analyzer

# Copy and fill in your API key
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY

docker-compose up --build
```

- **Frontend**: http://localhost:80
- **API**: http://localhost:3000

### Local Development

**Prerequisites**: Node.js 20+, PostgreSQL 16, Redis 7

```bash
# Install all workspace dependencies
npm install --workspaces --include-workspace-root

# Set environment variables
cp .env.example .env
# Edit .env

# Build the engine package first
npm run build:engine

# Start the server (auto-runs DB migrations)
cd server && npm run dev

# In another terminal, start the client
cd client && npm run dev
```

- **Frontend**: http://localhost:5173 (proxies API to :3000)
- **API**: http://localhost:3000

## Project Structure

```
log-analyzer/
├── client/          # React + TypeScript + Tailwind frontend
│   ├── src/
│   │   ├── components/  # Dashboard, LogTable, AIAnalysis, etc.
│   │   ├── api/         # Typed API client
│   │   └── types/       # Shared TypeScript types
│   └── Dockerfile
├── server/          # Express API server
│   ├── src/
│   │   ├── routes/      # ingest, analysis, sessions, alerts, export
│   │   ├── services/    # Claude streaming, Redis cache, alert webhooks
│   │   ├── db/          # PostgreSQL connection + migrations
│   │   └── middleware/  # File upload, error handler
│   └── Dockerfile
├── engine/          # Standalone log analysis engine
│   └── src/
│       ├── parsers/     # apache, syslog, json-log, kubernetes, generic
│       ├── scorer.ts    # Rule-based risk scoring (0–100)
│       ├── patterns.ts  # Burst/attack pattern detection
│       └── clusterer.ts # Error deduplication by template
├── samples/         # Test log files (apache, syslog, kubernetes, json)
├── docker-compose.yml
├── .env.example
├── README.md
└── API.md
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Claude API key |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |

## Sample Log Files

Test files are in the `/samples` directory:

| File | Format | Contains |
|---|---|---|
| `apache.log` | Apache Combined | Brute force, path traversal, 503 spikes |
| `syslog.log` | RFC 3164 syslog | OOM kills, SSH brute force, disk errors |
| `kubernetes.log` | k8s + glog | CrashLoopBackOff, OOMKilled, eviction |
| `app.json` | JSON structured | DB failure, auth brute force, timeouts |

## API

See [API.md](./API.md) for full endpoint documentation.

## Architecture

```
Browser → Nginx (80) → React SPA
                    ↕ /api proxy
              Express API (3000)
                ↕           ↕          ↕
           PostgreSQL    Redis       Claude API
           (sessions)   (cache)    (streaming)
                ↕
            Engine (npm workspace)
            parsers → scorer → clusterer → patterns
```
