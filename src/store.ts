import type { Kv } from './env'

const DAY = 86400

export type Member = { username: string; at: string }

export function store(kv: Kv) {
  const after = async (prefix: string, last: string) => {
    const { keys } = await kv.list({ prefix })
    const fresh = keys.filter((k) => k.name.slice(prefix.length) > last)
    return Promise.all(fresh.map(async (k) => (await kv.get(k.name)) ?? ''))
  }

  return {
    async claimComment(id: string): Promise<boolean> {
      const key = `done:${id}`
      if (await kv.get(key)) return false
      await kv.put(key, '1', { expirationTtl: 8 * DAY })
      return true
    },
    async member(igsid: string): Promise<Member | null> {
      const raw = await kv.get(`member:${igsid}`)
      return raw ? (JSON.parse(raw) as Member) : null
    },
    async addMember(igsid: string, username: string, now: Date): Promise<void> {
      const member: Member = { username, at: now.toISOString() }
      await kv.put(`member:${igsid}`, JSON.stringify(member))
      await kv.put(`day:${member.at}:${igsid}`, JSON.stringify(member), { expirationTtl: 3 * DAY })
    },
    async caption(mediaId: string, load: () => Promise<string>): Promise<string> {
      const key = `caption:${mediaId}`
      const cached = await kv.get(key)
      if (cached !== null) return cached
      const caption = await load()
      await kv.put(key, caption, { expirationTtl: 600 })
      return caption
    },
    async error(now: Date, message: string): Promise<void> {
      await kv.put(`err:${now.toISOString()}:${crypto.randomUUID()}`, message.slice(0, 300), { expirationTtl: 3 * DAY })
    },
    async since(last: string): Promise<{ members: Member[]; errors: string[] }> {
      const members = (await after('day:', last)).filter(Boolean).map((raw) => JSON.parse(raw) as Member)
      const errors = (await after('err:', last)).filter(Boolean)
      return { members, errors }
    },
    async lastSummary(): Promise<string> {
      return (await kv.get('summary:last')) ?? ''
    },
    async setLastSummary(at: string): Promise<void> {
      await kv.put('summary:last', at)
    },
  }
}

export type Store = ReturnType<typeof store>
