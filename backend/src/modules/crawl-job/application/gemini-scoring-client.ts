import { GeminiScoringOutput } from '../domain/crawl-scoring.types.js';

export interface GeminiScoringClientOptions {
  apiKey?: string;
  defaultModel?: string;
  maxConcurrency?: number;
  timeoutMs?: number;
}

export class GeminiScoringClient {
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private activeRequests = 0;
  private readonly maxConcurrency: number;

  constructor(options: GeminiScoringClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = options.defaultModel || 'gemini-2.5-flash';
    this.maxConcurrency = options.maxConcurrency || 5;
    this.timeoutMs = options.timeoutMs || 30_000;
  }

  async evaluateRow(input: {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
  }): Promise<GeminiScoringOutput> {
    const model = input.model || this.defaultModel;
    const temperature = input.temperature ?? 0.2;

    // Rate-limiting throttle: wait if active requests hit maxConcurrency
    while (this.activeRequests >= this.maxConcurrency) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.activeRequests++;
    try {
      if (!this.apiKey) {
        return this.heuristicFallback(input.userPrompt);
      }

      return await this.callGeminiWithRetry(input.systemPrompt, input.userPrompt, model, temperature);
    } finally {
      this.activeRequests--;
    }
  }

  private async callGeminiWithRetry(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number
  ): Promise<GeminiScoringOutput> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const payload = {
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
      },
    };

    let attempt = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const status = res.status;
          const errorBody = await res.text().catch(() => '');
          const isRetryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

          if (isRetryable && attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            console.warn(`[GeminiScoringClient] HTTP ${status}, retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw new Error(`Gemini API returned HTTP ${status}: ${errorBody.slice(0, 300)}`);
        }

        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error('Gemini response candidate text was empty');
        }

        const parsed = JSON.parse(rawText) as Record<string, unknown>;
        return this.validateAndNormalizeOutput(parsed);
      } catch (err: unknown) {
        lastError = err as Error;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Gemini API call failed after retries');
  }

  private validateAndNormalizeOutput(parsed: Record<string, unknown>): GeminiScoringOutput {
    const rawScore = Number(parsed.score);
    if (!Number.isFinite(rawScore)) {
      throw new Error(`Invalid score in Gemini output: "${parsed.score}" is not a finite number.`);
    }

    const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
    if (!reason) {
      throw new Error('Missing or empty "reason" field in Gemini output.');
    }

    const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.min(1.0, Math.max(0.0, parsed.confidence))
      : 0.90;

    const evidence = Array.isArray(parsed.evidence)
      ? parsed.evidence.map((item: Record<string, unknown>) => ({
          source_reference: typeof item?.source_reference === 'string' ? item.source_reference : undefined,
          claim: typeof item?.claim === 'string' ? item.claim : JSON.stringify(item),
        }))
      : [];

    const flags = Array.isArray(parsed.flags)
      ? parsed.flags.filter((f) => typeof f === 'string')
      : [];

    return {
      score: rawScore,
      reason,
      confidence,
      evidence,
      flags,
    };
  }

  private heuristicFallback(userPrompt: string): GeminiScoringOutput {
    console.warn('[GeminiScoringClient] GEMINI_API_KEY is not configured; using calibrated heuristic fallback evaluation.');
    let score = 4.0;
    let reason = 'The employee met performance expectations based on the raw metrics provided.';

    try {
      const parsedMatch = userPrompt.match(/\{[\s\S]*\}/);
      if (parsedMatch) {
        const payload = JSON.parse(parsedMatch[0]) as {
          measurement?: { value?: number };
          raw_data?: Record<string, unknown>;
        };
        const val = payload.measurement?.value ?? 0;
        if (val >= 90) score = 5.0;
        else if (val >= 75) score = 4.0;
        else if (val >= 60) score = 3.0;
        else if (val >= 40) score = 2.0;
        else score = 1.0;
        reason = `Evaluated measurement value ${val}. According to the KPI threshold rubric, this corresponds to score ${score}.`;
      }
    } catch {
      // ignore
    }

    return {
      score,
      reason,
      confidence: 0.85,
      evidence: [{ claim: `Direct evaluation of prompt payload metrics with score ${score}` }],
      flags: ['HEURISTIC_EVALUATION'],
    };
  }
}
