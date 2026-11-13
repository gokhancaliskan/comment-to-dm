import { describe, expect, it } from 'vitest'
import { store } from '../src/store'
import { buildSummary, sendSummary } from '../src/summary'
import { fakeKv } from './fakes'

const env = { RESEND_API_KEY: 'k', SUMMARY_TO: 'to@x', SUMMARY_FROM: 'Bot <from@x>' }

describe('buildSummary', () => {
  it('returns null when there is nothing to report', () => {
    expect(buildSummary([], [])).toBeNull()
  })
  it('lists members with profile links and warns about errors', () => {
    const s = buildSummary([{ username: 'ayse', at: '2026-11-08T10:00:00.000Z' }], ['token invalid', 'token invalid'])
    expect(s?.subject).toBe('comment-to-dm: 1 new member, 2 errors')
    expect(s?.html).toContain('https://www.instagram.com/ayse/')
    expect(s?.html).toContain('⚠️ 2 errors today')
    expect(s?.html).toContain('token invalid')
  })
  it('escapes usernames', () => {
    expect(buildSummary([{ username: '<b>', at: '' }], [])?.html).toContain('&lt;b&gt;')
  })
})

describe('sendSummary', () => {
  it('sends new members through Resend and moves the marker', async () => {
    const s = store(fakeKv())
    await s.addMember('u1', 'ayse', new Date('2026-11-08T10:00:00Z'))
    const calls: RequestInit[] = []
    const http = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {})
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    expect(await sendSummary(env, s, new Date('2026-11-08T17:00:00Z'), http)).toBe('sent')
    const body = JSON.parse(String(calls[0]?.body))
    expect(body.to).toEqual(['to@x'])
    expect(body.from).toBe('Bot <from@x>')
    expect(await s.lastSummary()).toBe('2026-11-08T17:00:00.000Z')
    expect(await sendSummary(env, s, new Date('2026-11-09T17:00:00Z'), http)).toBe('empty')
    expect(calls).toHaveLength(1)
  })

  it('stays off without a Resend key or addresses', async () => {
    const s = store(fakeKv())
    await s.addMember('u1', 'ayse', new Date('2026-11-08T10:00:00Z'))
    expect(await sendSummary({}, s, new Date('2026-11-08T17:00:00Z'))).toBe('off')
    expect(await s.lastSummary()).toBe('')
  })
})
