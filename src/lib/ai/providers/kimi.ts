import type { ProviderResult } from '../types'
import { generateChatCompletions } from './openai'
import type { ProviderArgs } from './shared'

// Moonshot (Kimi) runs two independent platforms with non-interchangeable
// keys: the global one (console at platform.kimi.ai, API at
// api.moonshot.ai) and the mainland-China one (api.moonshot.cn). Default
// to global; `KIMI_BASE_URL` switches an account to the .cn host — a key
// from one gets a 401 against the other.
//
// Model ids differ between the two and churn fast (the global platform is
// on kimi-k3 / kimi-k2.6 while older docs still say kimi-latest), which is
// why the model stays free text in the UI. `GET /v1/models` lists what a
// given key can actually reach.
const DEFAULT_KIMI_BASE_URL = 'https://api.moonshot.ai/v1'

// Every current Kimi model reasons before answering (k3 and k2.7-code
// always, k2.6 by default), and the reasoning is returned in a separate
// `reasoning_content` field that is billed against the SAME max_tokens
// budget as the answer. Under the shared 1024-token ceiling the model
// spends the whole budget thinking, `content` comes back empty, and the
// adapter reports "Kimi returned an empty response" — which looks like a
// provider fault but is really a truncation. Moonshot's own guidance is
// >= 16000 so both fields fit. Note this is a CEILING, not a spend: short
// answers still cost what they cost. `KIMI_MAX_OUTPUT_TOKENS` lowers it
// for anyone who disables thinking and wants tighter, cheaper replies.
const DEFAULT_KIMI_MAX_OUTPUT_TOKENS = 16000

function kimiUrl(): string {
  const base = process.env.KIMI_BASE_URL?.trim() || DEFAULT_KIMI_BASE_URL
  return `${base.replace(/\/+$/, '')}/chat/completions`
}

function kimiMaxOutputTokens(): number {
  const raw = Number(process.env.KIMI_MAX_OUTPUT_TOKENS)
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_KIMI_MAX_OUTPUT_TOKENS
}

// Reasoning is what makes a support reply take 30s+ and burn thousands of
// tokens. Which knob turns it down depends on the model, and passing the
// wrong one is an error rather than a no-op, so this stays opt-in via
// `KIMI_THINKING` and sends nothing when unset:
//
//   disabled          -> {"thinking":{"type":"disabled"}}   k2.6 only
//   low | high | max  -> {"reasoning_effort":"<value>"}      k3 only
//
// k2.7-code always reasons and rejects both. For a WhatsApp agent the
// answer is normally kimi-k2.6 with KIMI_THINKING=disabled.
function kimiThinkingBody(): Record<string, unknown> | undefined {
  const mode = process.env.KIMI_THINKING?.trim().toLowerCase()
  if (!mode) return undefined
  if (mode === 'disabled') return { thinking: { type: 'disabled' } }
  if (mode === 'low' || mode === 'high' || mode === 'max') {
    return { reasoning_effort: mode }
  }
  return undefined
}

/** Kimi's API is OpenAI-compatible apart from the max-tokens param. */
export async function generateKimi(args: ProviderArgs): Promise<ProviderResult> {
  return generateChatCompletions(args, {
    url: kimiUrl(),
    label: 'Kimi',
    maxTokensParam: 'max_tokens',
    maxOutputTokens: kimiMaxOutputTokens(),
    extraBody: kimiThinkingBody(),
  })
}
