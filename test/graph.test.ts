import { describe, expect, it } from 'vitest'
import { GraphError, graph, isConsentError } from '../src/graph'

const env = { IG_TOKEN: 'tok', IG_USER_ID: '178', PAGE_ID: '555', GRAPH_VERSION: 'v27.0' }

function recorder(response: unknown, status = 200, ...more: unknown[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const replies = [response, ...more]
  const http = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)]
    return new Response(JSON.stringify(reply), { status: calls.length === replies.length ? status : 200 })
  }) as typeof fetch
  return { calls, http }
}

describe('graph', () => {
  it('sends a private reply to the comment through the account messages edge', async () => {
    const r = recorder({ recipient_id: 'u1', message_id: 'm1' })
    await graph(env, r.http).privateReply('c9', { text: 'hi' })
    expect(r.calls[0]?.url).toBe('https://graph.facebook.com/v27.0/178/messages')
    expect(r.calls[0]?.init.method).toBe('POST')
    expect(JSON.parse(String(r.calls[0]?.init.body))).toEqual({ recipient: { comment_id: 'c9' }, message: { text: 'hi' } })
    expect((r.calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('sends a direct message by scoped id', async () => {
    const r = recorder({ recipient_id: 'u1' })
    await graph(env, r.http).send('u1', { text: 'yo' })
    expect(JSON.parse(String(r.calls[0]?.init.body))).toEqual({ recipient: { id: 'u1' }, message: { text: 'yo' } })
  })

  it('posts a public reply with the message as a query parameter', async () => {
    const r = recorder({ id: 'r1' })
    await graph(env, r.http).replyPublic('c9', 'Check your DMs 📬')
    const url = new URL(r.calls[0]?.url ?? '')
    expect(url.pathname).toBe('/v27.0/c9/replies')
    expect(url.searchParams.get('message')).toBe('Check your DMs 📬')
  })

  it('reads the caption', async () => {
    expect(await graph(env, recorder({ caption: 'Comment TEST' }).http).caption('m1')).toBe('Comment TEST')
  })

  it('reads the follow flag with the page token fetched by the system token', async () => {
    const r = recorder({ access_token: 'ptok' }, 200, { username: 'ayse', is_user_follow_business: true })
    const g = graph(env, r.http)
    expect(await g.profile('u1')).toEqual({ username: 'ayse', follows: true })
    expect(new URL(r.calls[0]?.url ?? '').pathname).toBe('/v27.0/555')
    expect((r.calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer tok')
    expect(new URL(r.calls[1]?.url ?? '').pathname).toBe('/v27.0/u1')
    expect((r.calls[1]?.init.headers as Record<string, string>).authorization).toBe('Bearer ptok')
    await g.profile('u2')
    expect(r.calls).toHaveLength(3)
  })

  it('throws GraphError with the Meta error message', async () => {
    const r = recorder({ access_token: 'ptok' }, 400, { error: { message: 'User consent is required to access the user profile.', code: 230 } })
    const error = await graph(env, r.http).profile('u1').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GraphError)
    expect(isConsentError(error)).toBe(true)
    expect(isConsentError(new Error('consent'))).toBe(false)
  })
})
