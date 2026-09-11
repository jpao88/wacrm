import type { ProviderResult } from '../types'
import { generateChatCompletions } from './openai'
import type { ProviderArgs } from './shared'

// Moonshot (Kimi) runs two independent platforms with non-interchangeable
// keys: the global one (platform.moonshot.ai) and the mainland-China one
// (platform.moonshot.cn). Default to global; `KIMI_BASE_URL` switches an
// account to the .cn host — its key gets a 401 against the other.
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
