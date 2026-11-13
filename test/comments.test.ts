import { describe, expect, it } from 'vitest'
import { handleComment, type Deps } from '../src/comments'
import { GraphError } from '../src/graph'
import { store } from '../src/store'
import { fakeGraph, fakeKv } from './fakes'

const env = { IG_USER_ID: '178', HANDLE: 'acme', KEYWORD: 'test', REWARD: 'Here is your link: L' }
const event = { commentId: 'c1', mediaId: 'm1', fromId: 'u1', text: 'TEST 🙋' }

function deps(graph = fakeGraph()): Deps & { graph: ReturnType<typeof fakeGraph> } {
  return { graph, store: store(fakeKv()), env, now: () => new Date('2026-11-08T10:00:00Z'), random: () => 0 }
}

describe('handleComment', () => {
  it('asks a new commenter to follow and replies publicly', async () => {
    const d = deps()
    expect(await handleComment(event, d)).toBe('asked')
    const reply = d.graph.calls.find((c) => c.name === 'privateReply')
    expect(reply?.args[0]).toBe('c1')
    expect(JSON.stringify(reply?.args[1])).toContain('I followed')
    expect(JSON.stringify(reply?.args[1])).toContain('follow @acme')
    expect(d.graph.calls.find((c) => c.name === 'replyPublic')?.args).toEqual(['c1', 'Check your DMs 📬'])
  })

  it('skips comments without the keyword, own comments and posts without the call', async () => {
    expect(await handleComment({ ...event, text: 'nice game' }, deps())).toBe('skip')
    expect(await handleComment({ ...event, fromId: '178' }, deps())).toBe('skip')
    const noCall = deps(fakeGraph({ caption: async () => 'Guess the game' }))
    expect(await handleComment(event, noCall)).toBe('skip:caption')
    expect(noCall.graph.calls).toEqual([])
  })

  it('handles the same comment only once', async () => {
    const d = deps()
    await handleComment(event, d)
    expect(await handleComment(event, d)).toBe('skip:duplicate')
    expect(d.graph.calls.filter((c) => c.name === 'privateReply')).toHaveLength(1)
  })

  it('sends the reward again to an existing member without the button', async () => {
    const d = deps()
    await d.store.addMember('u1', 'ayse', new Date())
    expect(await handleComment(event, d)).toBe('again')
    const text = JSON.stringify(d.graph.calls.find((c) => c.name === 'privateReply')?.args[1])
    expect(text).toContain('Here is your link: L')
    expect(text).not.toContain('I followed')
  })

  it('gives up quietly when Meta refuses the private reply', async () => {
    const d = deps(fakeGraph({ privateReply: async () => Promise.reject(new GraphError(400, 10, 'expired')) }))
    expect(await handleComment(event, d)).toBe('skip:private-reply')
  })

  it('records an error when the public reply fails but still counts the ask', async () => {
    const d = deps(fakeGraph({ replyPublic: async () => Promise.reject(new GraphError(400, 1, 'boom')) }))
    expect(await handleComment(event, d)).toBe('asked')
    expect((await d.store.since('')).errors).toEqual(['public reply: boom'])
  })
})
