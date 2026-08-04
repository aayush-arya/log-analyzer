# Log Analyzer API Reference

Base URL: `http://localhost:3000`

All endpoints accept and return JSON unless noted.

---

## Ingest

### `POST /api/ingest`

Analyze a log file (multipart form upload) or raw pasted text.

**File upload** (multipart/form-data):
```
Content-Type: multipart/form-data
Field: file  — .log / .txt / .json file (max 50 MB)
```

**Paste text** (application/json):
```json
{
  "text": "..raw log content..",
  "filename": "my-app.log"
}
```

**Response** `201`: Full `AnalysisResult` object (see Types below)

---

### `POST /api/ingest/raw`

Push logs from external services (JSON body only).

```json
{
  "text": "..log content..",
  "filename": "service-name.log"
}
```

**Response** `201`: `AnalysisResult`

---

## Analysis

### `GET /api/analysis/:sessionId`

Get the full analysis result for a session.

**Response** `200`: `AnalysisResult`

---

### `GET /api/analysis/:sessionId/stream`

Stream Claude AI analysis as Server-Sent Events (SSE).

**Response**: `text/event-stream`

Events:
```
data: {"type":"text","text":"...streaming text chunk..."}
data: {"type":"done","analysis":{...AIAnalysis object...}}
data: {"type":"error","message":"...error message..."}
```

**Example** (curl):
```bash
curl -N http://localhost:3000/api/analysis/<sessionId>/stream
```

---

## Sessions

### `GET /api/sessions`

List analysis sessions.

**Query params**:
- `limit` (default: 50)
- `offset` (default: 0)
- `search` — filter by filename

**Response** `200`:
```json
{
  "sessions": [...SessionListItem],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### `GET /api/sessions/:id`

Get a single session including the full result.

**Response** `200`: `SessionListItem & { full_result: AnalysisResult }`

---

### `DELETE /api/sessions/:id`

Delete a session permanently.

**Response** `204`

---

### `GET /api/sessions/search/:term`

Full-text search across filenames and log content.

**Response** `200`:
```json
{ "results": [...SessionListItem], "term": "OOMKilled" }
```

---

## Alerts

### `GET /api/alerts/config`

Get current alert configuration.

**Response** `200`: `AlertConfig`

---

### `PUT /api/alerts/config`

Update alert configuration.

```json
{
  "critical_threshold": 5,
  "high_threshold": 10,
  "enabled": true,
  "webhook_url": "https://hooks.slack.com/services/...",
  "webhook_type": "slack"
}
```

**Response** `200`: Updated `AlertConfig`

---

### `POST /api/alerts/test`

Send a test webhook to verify configuration.

**Response** `200`: `{ "success": true, "message": "Test alert sent" }`

---

## Export

### `GET /api/export/:sessionId?format=pdf|json`

Export analysis report.

- `format=pdf` → `application/pdf` download
- `format=json` → `application/json` download

**Response**: File download with `Content-Disposition: attachment`

---

## Health

### `GET /health`

**Response** `200`: `{ "status": "ok", "version": "1.0.0" }`

---

## Types

### AnalysisResult
```typescript
{
  sessionId: string;
  filename: string;
  format: "apache" | "nginx" | "syslog" | "json" | "kubernetes" | "generic";
  totalLines: number;
  createdAt: string;           // ISO 8601
  entries: LogEntry[];
  clusters: ErrorCluster[];
  patterns: PatternSummary;
  metrics: AnalysisMetrics;
}
```

### LogEntry
```typescript
{
  id: string;
  lineNumber: number;
  timestamp: string | null;
  level: string;               // raw level e.g. "ERROR"
  severity: "critical" | "high" | "medium" | "low" | "normal";
  message: string;
  source: string;
  rawLine: string;
  riskScore: number;           // 0–100
  anomalyReasons: string[];
  clusterId?: string;
  metadata: Record<string, unknown>;
}
```

### AnalysisMetrics
```typescript
{
  totalLines: number;
  parsedLines: number;
  anomalyCount: number;        // critical + high
  warningCount: number;        // medium
  healthScore: number;         // 0–100 (higher = healthier)
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  normalCount: number;
}
```

### AlertConfig
```typescript
{
  id: string;
  critical_threshold: number;
  high_threshold: number;
  enabled: boolean;
  webhook_url: string | null;
  webhook_type: "slack" | "generic" | null;
  email_recipient: string | null;
}
```

---

## Error Responses

```json
{ "error": "Human-readable error message" }
```

Status codes: `400` Bad Request · `404` Not Found · `413` Payload Too Large · `429` Rate Limited · `500` Server Error
