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

function kimiUrl(): string {
  const base = process.env.KIMI_BASE_URL?.trim() || DEFAULT_KIMI_BASE_URL
  return `${base.replace(/\/+$/, '')}/chat/completions`
}

/** Kimi's API is OpenAI-compatible apart from the max-tokens param. */
export async function generateKimi(args: ProviderArgs): Promise<ProviderResult> {
  return generateChatCompletions(args, {
    url: kimiUrl(),
    label: 'Kimi',
    maxTokensParam: 'max_tokens',
  })
}
