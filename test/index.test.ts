import { describe, expect, it } from 'vitest'
import worker, { processEvents } from '../src/index'
import type { Env } from '../src/env'
import { store } from '../src/store'
import { fakeGraph, fakeKv } from './fakes'

const env = {
  KV: fakeKv(),
  IG_TOKEN: 't',
  APP_SECRET: 'sec',
  VERIFY_TOKEN: 'vt',
  RESEND_API_KEY: 'r',
  IG_USER_ID: '178',
  PAGE_ID: '555',
  GRAPH_VERSION: 'v27.0',
  HANDLE: 'acme',
  KEYWORD: 'test',
  REWARD: 'L',
  SUMMARY_TO: 'a@x',
  SUMMARY_FROM: 'b@x',
} satisfies Env

const ctx = () => {
  const waits: Promise<unknown>[] = []
  return { waits, waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException: () => undefined } as unknown as ExecutionContext & {
    waits: Promise<unknown>[]
  }
}

describe('fetch', () => {
  it('answers the Meta verification request', async () => {
    const res = await worker.fetch(new Request('https://w/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=7'), env, ctx())
    expect(await res.text()).toBe('7')
  })

  it('rejects unsigned posts', async () => {
    const res = await worker.fetch(new Request('https://w/webhook', { method: 'POST', body: '{}' }), env, ctx())
    expect(res.status).toBe(401)
  })

  it('accepts signed posts and hands work to waitUntil', async () => {
    const body = JSON.stringify({ object: 'instagram', entry: [] })
    const sig = 'sha256=13633abf3cad767b9568de9a7b6eae644b59c37abea4cd6302af5e26b1a28d4b'
    const c = ctx()
    const res = await worker.fetch(new Request('https://w/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': sig } }), env, c)
    expect(res.status).toBe(200)
    expect(c.waits).toHaveLength(1)
  })

  it('returns 404 elsewhere', async () => {
    expect((await worker.fetch(new Request('https://w/'), env, ctx())).status).toBe(404)
  })
})

describe('processEvents', () => {
  it('runs each event and records failures without stopping', async () => {
    const s = store(fakeKv())
    const graph = fakeGraph({ caption: async () => Promise.reject(new Error('caption down')) })
    const deps = { graph, store: s, env, now: () => new Date('2026-11-08T10:00:00Z'), random: () => 0 }
    const results = await processEvents(
      [
        { kind: 'comment', event: { commentId: 'c1', mediaId: 'm1', fromId: 'u1', text: 'test' } },
        { kind: 'followed', igsid: 'u2' },
      ],
      deps,
    )
    expect(results).toEqual(['error', 'welcomed'])
    expect((await s.since('')).errors).toEqual(['comment: caption down'])
  })
})
