import { GoogleGenAI, ThinkingLevel } from '@google/genai';

/**
 * aiService.ts — the single place that talks to a GenAI provider.
 *
 * Supports a FALLBACK CHAIN so you can list several providers and the app
 * automatically tries the next one if one is missing, rate-limited or down.
 *
 * Configure in .env, e.g.:
 *   AI_PROVIDER=gemini,groq,openai,cerebras,openrouter,pollinations,mock
 *
 * Free options (2026):
 *   - pollinations  : NO KEY NEEDED, anonymous OpenAI-compatible endpoint
 *   - openrouter    : free key at openrouter.ai/keys (use a ":free" model)
 *   - cerebras      : free key at cloud.cerebras.ai (blazing fast inference)
 *
 * Any provider without an API key is skipped. If none answer (or you set
 * AI_PROVIDER=mock), the app falls back to a clear offline demo message so
 * every feature stays testable with no key at all.
 */

export const OFFLINE_DEMO_MESSAGE =
`Hello! I am PathAI, your learning and career assistant. Currently running in offline demo mode so you can test all features right away without needing an API key.

Here are things we can do together:
• AI Chat & study questions
• Generate multiple-choice quizzes from your syllabus
• Summarize lengthy notes and articles
• Mock interview practice with real-time feedback
• Create structured career milestone roadmaps

To enable live AI answers, add a provider key to your .env file (Gemini, Groq, OpenAI, Cerebras or OpenRouter) and set AI_PROVIDER accordingly.

What would you like to explore today?`;

export type ProviderName = 'gemini' | 'groq' | 'openai' | 'cerebras' | 'openrouter' | 'pollinations' | 'mock';

/** Env var holding each provider's API key (pollinations is keyless). */
const KEY_ENV: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openai: 'OPENAI_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

/** Human-readable names used in the UI status labels. */
const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  openai: 'OpenAI',
  cerebras: 'Cerebras',
  openrouter: 'OpenRouter',
  pollinations: 'Pollinations',
};

const DEFAULT_CHAIN = 'pollinations,gemini,groq,openai,cerebras,openrouter,mock';
const REQUEST_TIMEOUT_MS = 30000;
/** Hard ceiling for a single provider (HTTP + SDK retries). */
const PROVIDER_DEADLINE_MS = 25000;
/** Individual Gemini HTTP request timeout (no SDK retries). */
const GEMINI_TIMEOUT_MS = 20000;
/** Extra output budget so Gemini thinking tokens don't truncate the answer. */
const GEMINI_THINKING_ALLOWANCE = 1024;

/** Ordered list of providers to try, from AI_PROVIDER (comma-separated). */
export function providerChain(): string[] {
  return (process.env.AI_PROVIDER || DEFAULT_CHAIN)
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function apiKeyFor(provider: string): string {
  const envName = KEY_ENV[provider];
  return envName ? (process.env[envName] || '').trim() : '';
}

/** A provider is "live" only if it has a plausible API key set. */
export function hasKey(provider: string): boolean {
  // Pollinations needs no key: it qualifies as live whenever it is listed.
  if (provider === 'pollinations') return true;
  const key = apiKeyFor(provider);
  return key.length > 10 && key !== 'mock';
}

/** Names of configured providers that have a key (never returns the keys). */
export function liveProviders(): string[] {
  return providerChain().filter((p) => p !== 'mock' && hasKey(p));
}

/** True when at least one real provider key is configured. */
export function hasLiveApiKey(): boolean {
  return liveProviders().length > 0;
}

/** Status info for the UI (labels only — keys are never exposed). */
export function engineInfo() {
  const live = liveProviders();
  const primary = live[0];
  const label = primary ? PROVIDER_LABELS[primary] || primary : '';
  return {
    has_live_key: live.length > 0,
    providers: live,
    mode: live.length ? 'live' : 'offline_demo',
    engine_label: live.length ? `${label.toUpperCase()} ACTIVE` : 'OFFLINE DEMO ENGINE',
    chat_pill_label: live.length
      ? `MODEL: ${label.toUpperCase()} // ONLINE`
      : 'ENGINE: OFFLINE DEMO // ACTIVE',
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Reject if a provider call does not settle within `ms` (wall-clock safety net). */
function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** OpenAI-compatible chat completion (OpenAI and Groq share this shape). */
async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  system: string,
  maxTokens: number,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system || 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        ...extra,
      }),
    },
    REQUEST_TIMEOUT_MS
  );
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini(prompt: string, system: string, maxTokens: number): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: apiKeyFor('gemini'),
    // Fail fast: the SDK retries 5x with backoff (up to ~60s) by default, which
    // makes the UI hang on rate limits. One attempt + a hard timeout instead, so
    // a stuck Gemini call falls through to the next provider quickly.
    httpOptions: { timeout: GEMINI_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const full = system ? `${system}\n\n${prompt}` : prompt;
  // Gemini 3.x are thinking models: thoughts count against maxOutputTokens, so
  // keep thinking low and add headroom or the visible answer gets truncated.
  const budget = maxTokens + GEMINI_THINKING_ALLOWANCE;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: full,
      config: { maxOutputTokens: budget, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    return response.text ?? '';
  } catch (err: any) {
    // Some model versions reject thinkingConfig — retry once without it.
    const msg = String(err?.message || err);
    if (!/thinking|unknown name|invalid json|unrecognized/i.test(msg)) throw err;
    console.warn('[aiService] Gemini rejected thinkingConfig, retrying without it.');
    const response = await ai.models.generateContent({
      model,
      contents: full,
      config: { maxOutputTokens: budget },
    });
    return response.text ?? '';
  }
}

async function callGroq(prompt: string, system: string, maxTokens: number): Promise<string> {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  // Groq's gpt-oss models are reasoning models: reasoning tokens count against
  // max_tokens, so keep reasoning short to leave room for the actual answer.
  const extra = /gpt-oss/i.test(model) ? { reasoning_effort: 'low' } : {};
  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    apiKeyFor('groq'),
    model,
    prompt,
    system,
    maxTokens,
    extra
  );
}

async function callOpenAI(prompt: string, system: string, maxTokens: number): Promise<string> {
  return callOpenAICompatible(
    'https://api.openai.com/v1/chat/completions',
    apiKeyFor('openai'),
    process.env.OPENAI_MODEL || 'gpt-4o-mini',
    prompt,
    system,
    maxTokens
  );
}

// ------------------------------------------------------- Free-tier providers --

async function callPollinations(prompt: string, system: string, maxTokens: number): Promise<string> {
  // Free + keyless (anonymous tier). OpenAI-compatible shape at text.pollinations.ai.
  return callOpenAICompatible(
    'https://text.pollinations.ai/openai',
    process.env.POLLINATIONS_API_KEY || 'anonymous',
    process.env.POLLINATIONS_MODEL || 'openai',
    prompt,
    system,
    maxTokens
  );
}

async function callCerebras(prompt: string, system: string, maxTokens: number): Promise<string> {
  const model = process.env.CEREBRAS_MODEL || 'qwen-3.8-27b';
  // qwen on Cerebras reasons by default; disable so the answer is content-only.
  const extra = /qwen/i.test(model) ? { reasoning_effort: 'none' } : {};
  return callOpenAICompatible(
    'https://api.cerebras.ai/v1/chat/completions',
    apiKeyFor('cerebras'),
    model,
    prompt,
    system,
    maxTokens,
    extra
  );
}

async function callOpenRouter(prompt: string, system: string, maxTokens: number): Promise<string> {
  return callOpenAICompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    apiKeyFor('openrouter'),
    process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
    prompt,
    system,
    maxTokens
  );
}

const PROVIDER_CALLS: Record<string, (p: string, s: string, m: number) => Promise<string>> = {
  gemini: callGemini,
  groq: callGroq,
  openai: callOpenAI,
  cerebras: callCerebras,
  openrouter: callOpenRouter,
  pollinations: callPollinations,
};

/**
 * Try each configured provider in order and return the first successful
 * response. Falls back to the offline demo message so a missing key or a
 * flaky API never crashes a feature.
 */
export async function generateText(
  prompt: string,
  system: string = '',
  maxTokens: number = 700
): Promise<string> {
  for (const provider of providerChain()) {
    if (provider === 'mock') continue;
    const call = PROVIDER_CALLS[provider];
    if (!call) {
      console.warn(`[aiService] Unknown provider '${provider}' in AI_PROVIDER — skipping.`);
      continue;
    }
    if (!hasKey(provider)) continue;
    try {
      const text = await withDeadline(call(prompt, system, maxTokens), PROVIDER_DEADLINE_MS, provider);
      if (text && text.trim()) return text.trim();
    } catch (err: any) {
      console.warn(`[aiService] Provider '${provider}' failed (${err?.message || err}); trying next.`);
    }
  }
  return OFFLINE_DEMO_MESSAGE;
}
