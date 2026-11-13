import { describe, expect, it } from 'vitest'
import { store } from '../src/store'
import { fakeKv } from './fakes'

describe('store', () => {
  it('claims a comment only once', async () => {
    const s = store(fakeKv())
    expect(await s.claimComment('c1')).toBe(true)
    expect(await s.claimComment('c1')).toBe(false)
  })

  it('remembers members and reports them after the last summary', async () => {
    const s = store(fakeKv())
    await s.addMember('u1', 'ayse', new Date('2026-11-08T10:00:00Z'))
    await s.setLastSummary('2026-11-08T12:00:00Z')
    await s.addMember('u2', 'mehmet', new Date('2026-11-08T15:00:00Z'))
    expect(await s.member('u1')).toEqual({ username: 'ayse', at: '2026-11-08T10:00:00.000Z' })
    const { members } = await s.since(await s.lastSummary())
    expect(members.map((m) => m.username)).toEqual(['mehmet'])
  })

  it('caches captions', async () => {
    const s = store(fakeKv())
    let calls = 0
    const load = async () => {
      calls++
      return 'Comment TEST'
    }
    expect(await s.caption('m1', load)).toBe('Comment TEST')
    expect(await s.caption('m1', load)).toBe('Comment TEST')
    expect(calls).toBe(1)
  })

  it('collects errors since a moment', async () => {
    const s = store(fakeKv())
    await s.error(new Date('2026-11-08T09:00:00Z'), 'old')
    await s.error(new Date('2026-11-08T16:00:00Z'), 'token invalid')
    const { errors } = await s.since('2026-11-08T12:00:00Z')
    expect(errors).toEqual(['token invalid'])
  })

  it('starts with an empty last summary', async () => {
    expect(await store(fakeKv()).lastSummary()).toBe('')
  })
})
