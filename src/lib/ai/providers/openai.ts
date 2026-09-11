import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

interface ChatCompletionsResponse {
  choices?: { message?: { content?: string } }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export interface ChatCompletionsTarget {
  /** Full chat-completions endpoint URL. */
  url: string
  /** Provider name used in error messages. */
  label: string
  /** OpenAI renamed this to `max_completion_tokens`; the compatible
   *  clones (Moonshot/Kimi) still only accept `max_tokens`. */
  maxTokensParam: 'max_completion_tokens' | 'max_tokens'
  /** Per-target output ceiling. Defaults to the shared
   *  `MAX_OUTPUT_TOKENS`; a target overrides it when the provider needs
   *  more headroom than a plain chat model (see kimi.ts, where the
   *  reasoning trace is billed against the same budget as the answer). */
  maxOutputTokens?: number
}

/**
 * Call an OpenAI-shaped Chat Completions endpoint with the caller's own
 * key. Returns the raw assistant text + token usage (handoff parsing
 * happens in `generateReply`).
 */
export async function generateChatCompletions(
  args: ProviderArgs,
  target: ChatCompletionsTarget,
): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args

  let res: Response
  try {
    res = await fetch(target.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...mergeConsecutive(messages),
        ],
        [target.maxTokensParam]: target.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError(target.label, res)
  }

  const data = (await res.json().catch(() => null)) as ChatCompletionsResponse | null
  const text = data?.choices?.[0]?.message?.content
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AiError(`${target.label} returned an empty response.`, {
      code: 'empty_response',
    })
  }
  const usage = normalizeUsage({
    prompt: data?.usage?.prompt_tokens,
    completion: data?.usage?.completion_tokens,
    total: data?.usage?.total_tokens,
  })
  return { text, usage }
}

export async function generateOpenAi(args: ProviderArgs): Promise<ProviderResult> {
  return generateChatCompletions(args, {
    url: OPENAI_URL,
    label: 'OpenAI',
    maxTokensParam: 'max_completion_tokens',
  })
}
