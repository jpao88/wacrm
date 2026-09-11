import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildSystemPrompt } from './defaults'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('buildSystemPrompt — today\'s date', () => {
  it('states the date in the configured timezone', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-11T10:00:00Z'))
    vi.stubEnv('AI_TIMEZONE', 'Europe/Madrid')

    const prompt = buildSystemPrompt({ userPrompt: null, mode: 'draft' })

    expect(prompt).toContain('2026-09-11')
    expect(prompt).toContain('Europe/Madrid')
  })

  it('resolves the date in the configured zone, not UTC', () => {
    // 00:30 UTC on the 12th is still the 11th in Los Angeles.
    vi.useFakeTimers().setSystemTime(new Date('2026-09-12T00:30:00Z'))
    vi.stubEnv('AI_TIMEZONE', 'America/Los_Angeles')

    expect(buildSystemPrompt({ userPrompt: null, mode: 'draft' })).toContain(
      '2026-09-11',
    )
  })

  it('falls back to UTC when the zone is invalid rather than throwing', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-11T10:00:00Z'))
    vi.stubEnv('AI_TIMEZONE', 'Not/AZone')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const prompt = buildSystemPrompt({ userPrompt: null, mode: 'draft' })

    expect(prompt).toContain('2026-09-11')
    expect(prompt).toContain('UTC')
  })
})
