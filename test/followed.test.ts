import { describe, expect, it } from 'vitest'
import type { Deps } from '../src/comments'
import { handleFollowed } from '../src/followed'
import { GraphError } from '../src/graph'
import { store } from '../src/store'
import { fakeGraph, fakeKv } from './fakes'

function deps(graph = fakeGraph()): Deps & { graph: ReturnType<typeof fakeGraph> } {
  return {
    graph,
    store: store(fakeKv()),
    env: { IG_USER_ID: '178', HANDLE: 'acme', KEYWORD: 'test', REWARD: 'Here is your link: L' },
    now: () => new Date('2026-11-08T10:00:00Z'),
    random: () => 0,
  }
}
const sent = (d: ReturnType<typeof deps>) => d.graph.calls.filter((c) => c.name === 'send').map((c) => JSON.stringify(c.args[1]))

describe('handleFollowed', () => {
  it('welcomes a follower with the reward and records the member once', async () => {
    const d = deps()
    expect(await handleFollowed('u1', d)).toBe('welcomed')
    expect(sent(d)[0]).toContain("You're in!")
    expect(sent(d)[0]).toContain('Here is your link: L')
    await handleFollowed('u1', d)
    expect((await d.store.since('')).members.map((m) => m.username)).toEqual(['ayse'])
  })

  it('asks a non-follower to follow and shows the button again', async () => {
    const d = deps(fakeGraph({ profile: async () => ({ username: 'ayse', follows: false }) }))
    expect(await handleFollowed('u1', d)).toBe('not-following')
    expect(sent(d)[0]).toContain('Follow @acme')
    expect(sent(d)[0]).toContain('I followed')
    expect(await d.store.member('u1')).toBeNull()
  })

  it('asks for a done reply when Meta needs consent', async () => {
    const consent = new GraphError(400, 230, 'User consent is required to access the user profile.')
    const d = deps(fakeGraph({ profile: async () => Promise.reject(consent) }))
    expect(await handleFollowed('u1', d)).toBe('consent')
    expect(sent(d)[0]).toContain('Reply \\"done\\"')
  })

  it('records other profile errors and offers a retry', async () => {
    const d = deps(fakeGraph({ profile: async () => Promise.reject(new GraphError(500, 2, 'temporary')) }))
    expect(await handleFollowed('u1', d)).toBe('retry')
    expect(sent(d)[0]).toContain("Couldn't check")
    expect((await d.store.since('')).errors).toEqual(['profile: temporary'])
  })
})
