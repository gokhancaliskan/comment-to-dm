import type { Kv } from '../src/env'
import type { Graph } from '../src/graph'

export function fakeKv(): Kv & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    async get(key) {
      return data.get(key) ?? null
    },
    async put(key, value) {
      data.set(key, value)
    },
    async list({ prefix }) {
      return { keys: [...data.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })) }
    },
  }
}

export function fakeGraph(overrides: Partial<Graph> = {}): Graph & { calls: { name: string; args: unknown[] }[] } {
  const calls: { name: string; args: unknown[] }[] = []
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push({ name, args })
    }
  return {
    calls,
    privateReply: overrides.privateReply ?? record('privateReply'),
    send: overrides.send ?? record('send'),
    replyPublic: overrides.replyPublic ?? record('replyPublic'),
    caption: overrides.caption ?? (async () => 'Comment TEST to join'),
    profile: overrides.profile ?? (async () => ({ username: 'ayse', follows: true })),
  }
}
