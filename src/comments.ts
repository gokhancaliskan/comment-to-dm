import type { Env } from './env'
import { GraphError, type Graph } from './graph'
import { isCallout, pick, wantsKeyword } from './match'
import type { CommentEvent } from './parse'
import type { Store } from './store'
import { publicReplies, texts, withButton } from './texts'

export type Deps = {
  graph: Graph
  store: Store
  env: Pick<Env, 'IG_USER_ID' | 'HANDLE' | 'KEYWORD' | 'REWARD'>
  now: () => Date
  random: () => number
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

export async function handleComment(event: CommentEvent, deps: Deps): Promise<string> {
  const { graph, store, env } = deps
  if (event.fromId === env.IG_USER_ID || !wantsKeyword(event.text, env.KEYWORD)) return 'skip'
  const caption = await store.caption(event.mediaId, () => graph.caption(event.mediaId))
  if (!isCallout(caption, env.KEYWORD)) return 'skip:caption'
  if (!(await store.claimComment(event.commentId))) return 'skip:duplicate'
  const member = await store.member(event.fromId)
  const message = member ? { text: texts.again(env.REWARD) } : withButton(texts.ask(env.HANDLE))
  try {
    await graph.privateReply(event.commentId, message)
  } catch (error) {
    if (error instanceof GraphError) return 'skip:private-reply'
    throw error
  }
  try {
    await graph.replyPublic(event.commentId, pick(publicReplies, deps.random))
  } catch (error) {
    await store.error(deps.now(), `public reply: ${reason(error)}`)
  }
  return member ? 'again' : 'asked'
}
