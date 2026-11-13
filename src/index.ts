import { handleComment, type Deps } from './comments'
import type { Env } from './env'
import { handleFollowed } from './followed'
import { graph } from './graph'
import { parse, type Incoming } from './parse'
import { store } from './store'
import { sendSummary } from './summary'
import { challenge, signed } from './verify'

export async function processEvents(items: Incoming[], deps: Deps): Promise<string[]> {
  const results: string[] = []
  for (const item of items) {
    try {
      const result = item.kind === 'comment' ? await handleComment(item.event, deps) : await handleFollowed(item.igsid, deps)
      console.log(item.kind, result)
      results.push(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(item.kind, 'error', message)
      await deps.store.error(deps.now(), `${item.kind}: ${message}`)
      results.push('error')
    }
  }
  return results
}

const deps = (env: Env): Deps => ({
  graph: graph(env),
  store: store(env.KV),
  env,
  now: () => new Date(),
  random: Math.random,
})

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname !== '/webhook') return new Response('not found', { status: 404 })
    if (req.method === 'GET') return challenge(url, env.VERIFY_TOKEN)
    if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
    const body = await req.text()
    if (!(await signed(body, req.headers.get('x-hub-signature-256'), env.APP_SECRET))) {
      return new Response('bad signature', { status: 401 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return new Response('bad json', { status: 400 })
    }
    const items = parse(parsed)
    console.log('received', items.length)
    ctx.waitUntil(processEvents(items, deps(env)))
    return new Response('ok')
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sendSummary(env, store(env.KV), new Date()).then((r) => console.log('summary', r)))
  },
}
