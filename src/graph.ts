import type { Env } from './env'

export type Button = { type: 'postback'; title: string; payload: string }
export type Message =
  | { text: string }
  | { attachment: { type: 'template'; payload: { template_type: 'button'; text: string; buttons: Button[] } } }
export type Profile = { username: string; follows: boolean }

export class GraphError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    message: string,
  ) {
    super(message)
  }
}

type Call = { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string>; token?: string }
type Reply = Record<string, unknown> & { error?: { message?: string; code?: number } }

export function graph(env: Pick<Env, 'IG_TOKEN' | 'IG_USER_ID' | 'PAGE_ID' | 'GRAPH_VERSION'>, http: typeof fetch = fetch) {
  let pageToken: string | undefined
  const call = async (path: string, { method = 'GET', body, query = {}, token = env.IG_TOKEN }: Call = {}): Promise<Reply> => {
    const url = new URL(`https://graph.facebook.com/${env.GRAPH_VERSION}${path}`)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    const headers: Record<string, string> = { authorization: `Bearer ${token}` }
    if (body !== undefined) headers['content-type'] = 'application/json'
    const res = await http(url.toString(), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = (await res.json()) as Reply
    if (!res.ok || data.error) throw new GraphError(res.status, data.error?.code, data.error?.message ?? `HTTP ${res.status}`)
    return data
  }
  const messages = `/${env.IG_USER_ID}/messages`

  return {
    async privateReply(commentId: string, message: Message): Promise<void> {
      await call(messages, { method: 'POST', body: { recipient: { comment_id: commentId }, message } })
    },
    async send(igsid: string, message: Message): Promise<void> {
      await call(messages, { method: 'POST', body: { recipient: { id: igsid }, message } })
    },
    async replyPublic(commentId: string, text: string): Promise<void> {
      await call(`/${commentId}/replies`, { method: 'POST', query: { message: text } })
    },
    async caption(mediaId: string): Promise<string> {
      const data = await call(`/${mediaId}`, { query: { fields: 'caption' } })
      return typeof data.caption === 'string' ? data.caption : ''
    },
    async profile(igsid: string): Promise<Profile> {
      if (!pageToken) {
        const page = await call(`/${env.PAGE_ID}`, { query: { fields: 'access_token' } })
        pageToken = typeof page.access_token === 'string' ? page.access_token : env.IG_TOKEN
      }
      const data = await call(`/${igsid}`, { query: { fields: 'username,is_user_follow_business' }, token: pageToken })
      return { username: typeof data.username === 'string' ? data.username : '', follows: data.is_user_follow_business === true }
    },
  }
}

export type Graph = ReturnType<typeof graph>

export const isConsentError = (error: unknown): boolean => error instanceof GraphError && /consent/i.test(error.message)
