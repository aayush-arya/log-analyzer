import Anthropic from '@anthropic-ai/sdk';
import { Response } from 'express';
import { config } from '../config';
import type { AnalysisResult } from '@log-analyzer/engine';

export interface AIAnalysis {
  summary: string;
  topAnomalies: string[];
  rootCause: string;
  immediateActions: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'normal';
  confidence: number;
}

const client = new Anthropic({ apiKey: config.anthropicApiKey });

function buildPrompt(result: AnalysisResult): string {
  const { metrics, entries, patterns } = result;

  const topEntries = [...entries]
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 40);

  const logSnippet = topEntries
    .map(e => `[Score:${e.riskScore}][${e.severity.toUpperCase()}] ${e.rawLine.slice(0, 200)}`)
    .join('\n');

  const burstInfo = patterns.burstPatterns.length > 0
    ? patterns.burstPatterns.map(p => `• ${p.description}`).join('\n')
    : 'None detected';

  return `You are a senior SRE/DevOps engineer performing log analysis. Analyze the following log data and provide a structured report.

## Log Statistics
- Total Lines: ${metrics.totalLines}
- Parsed Lines: ${metrics.parsedLines}
- Critical Issues: ${metrics.criticalCount}
- High Severity: ${metrics.highCount}
- Warnings: ${metrics.mediumCount}
- Health Score: ${metrics.healthScore}%
- Log Format: ${result.format}

## Burst/Attack Patterns Detected
${burstInfo}

## Top Anomalous Log Entries (sorted by risk score)
${logSnippet || 'No high-risk entries found.'}

---
Provide your analysis with these exact sections:

## Summary
[2-3 sentence overview of what happened]

## Top Anomalies
1. [Most critical issue with specific details]
2. [Second issue]
3. [Third issue]
(list up to 5)

## Root Cause
[Identify the most likely underlying cause(s) — be specific about what failed and why]

## Immediate Actions
1. [Specific actionable step]
2. [Specific actionable step]
3. [Specific actionable step]
(list up to 5)

## Risk Level
**[CRITICAL/HIGH/MEDIUM/LOW]** — [One sentence justification referencing actual log evidence]

Be specific, reference actual log content, and prioritize the most impactful issues.`;
}

export async function streamAnalysis(result: AnalysisResult, res: Response): Promise<AIAnalysis | null> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const prompt = buildPrompt(result);
  let fullText = '';

  try {
    const stream = client.messages.stream({
      model: config.claudeModel,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.delta.text })}\n\n`);
      }
    }

    const analysis = parseAIResponse(fullText);
    res.write(`data: ${JSON.stringify({ type: 'done', analysis })}\n\n`);
    res.end();
    return analysis;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI analysis failed';
    res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
    res.end();
    return null;
  }
}

function parseAIResponse(text: string): AIAnalysis {
  const section = (name: string): string => {
    const re = new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    return (text.match(re)?.[1] || '').trim();
  };

  const anomaliesText = section('Top Anomalies');
  const actionsText = section('Immediate Actions');
  const riskText = section('Risk Level');

  const riskMatch = riskText.match(/\*?\*?(CRITICAL|HIGH|MEDIUM|LOW)\*?\*?/i);
  const riskLevel = (riskMatch?.[1]?.toLowerCase() || 'medium') as AIAnalysis['riskLevel'];

  return {
    summary: section('Summary'),
    topAnomalies: anomaliesText.split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean),
    rootCause: section('Root Cause'),
    immediateActions: actionsText.split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean),
    riskLevel,
    confidence: 0.85,
  };
}
