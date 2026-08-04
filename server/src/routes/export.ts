import { Router, Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { queryOne } from '../db/index';
import type { AnalysisResult } from '@log-analyzer/engine';
import type { AIAnalysis } from '../services/claude';

export const exportRouter = Router();

interface SessionRow {
  filename: string;
  format: string;
  created_at: string;
  total_lines: number;
  health_score: number;
  full_result: AnalysisResult;
  ai_analysis: AIAnalysis | null;
}

// GET /api/export/:sessionId?format=pdf|json
exportRouter.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const format = (req.query.format as string || 'json').toLowerCase();

    const row = await queryOne<SessionRow>('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (!row) { res.status(404).json({ error: 'Session not found' }); return; }

    if (format === 'pdf') {
      await generatePDF(row, sessionId, res);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="log-analysis-${sessionId}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json({
        exportedAt: new Date().toISOString(),
        session: {
          id: sessionId,
          filename: row.filename,
          format: row.format,
          createdAt: row.created_at,
          metrics: row.full_result?.metrics,
          aiAnalysis: row.ai_analysis,
          clusters: row.full_result?.clusters,
          patterns: row.full_result?.patterns,
          entries: row.full_result?.entries,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

async function generatePDF(row: SessionRow, sessionId: string, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Disposition', `attachment; filename="log-analysis-${sessionId}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const result = row.full_result;
  const metrics = result?.metrics;

  doc.fontSize(22).font('Helvetica-Bold').text('Log Analysis Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#666666')
    .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('File Information');
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Filename: ${row.filename}`);
  doc.text(`Log Format: ${(result?.format || 'unknown').toUpperCase()}`);
  doc.text(`Analyzed: ${new Date(row.created_at).toLocaleString()}`);
  doc.text(`Session ID: ${sessionId}`);
  doc.moveDown(1);

  if (metrics) {
    doc.fontSize(12).font('Helvetica-Bold').text('Metrics Summary');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    for (const [label, value] of [
      ['Total Lines', metrics.totalLines],
      ['Health Score', `${metrics.healthScore}%`],
      ['Critical', metrics.criticalCount],
      ['High', metrics.highCount],
      ['Medium (Warnings)', metrics.mediumCount],
      ['Low', metrics.lowCount],
      ['Normal', metrics.normalCount],
    ]) {
      doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(String(value)).font('Helvetica');
    }
    doc.moveDown(1);
  }

  if (row.ai_analysis) {
    const ai = row.ai_analysis;
    doc.fontSize(12).font('Helvetica-Bold').text('AI Analysis');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    if (ai.summary) { doc.font('Helvetica-Bold').text('Summary').font('Helvetica').text(ai.summary); doc.moveDown(0.5); }
    if (ai.rootCause) { doc.font('Helvetica-Bold').text('Root Cause').font('Helvetica').text(ai.rootCause); doc.moveDown(0.5); }
    if (ai.immediateActions?.length) {
      doc.font('Helvetica-Bold').text('Immediate Actions');
      ai.immediateActions.forEach((a, i) => doc.font('Helvetica').text(`${i + 1}. ${a}`));
      doc.moveDown(0.5);
    }
    if (ai.riskLevel) doc.font('Helvetica-Bold').text(`Overall Risk Level: ${ai.riskLevel.toUpperCase()}`);
    doc.moveDown(1);
  }

  if (result?.entries?.length) {
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text('Top Anomalies');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);

    const topEntries = [...result.entries]
      .filter(e => e.severity === 'critical' || e.severity === 'high')
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    for (const entry of topEntries) {
      doc.font('Helvetica-Bold').fontSize(9)
        .text(`[Line ${entry.lineNumber}] [${entry.severity.toUpperCase()}] Score: ${entry.riskScore}`);
      doc.font('Courier').fontSize(8).fillColor('#333333')
        .text(entry.rawLine.slice(0, 120), { lineBreak: true });
      if (entry.anomalyReasons.length > 0) {
        doc.font('Helvetica').fontSize(8).fillColor('#666666')
          .text(`Reasons: ${entry.anomalyReasons.join(', ')}`);
      }
      doc.fillColor('#000000').moveDown(0.5);
    }
  }

  doc.end();
}
