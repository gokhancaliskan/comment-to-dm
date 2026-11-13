import { isDone } from './match'
import { FOLLOWED } from './texts'

export type CommentEvent = { commentId: string; mediaId: string; fromId: string; text: string }
export type Incoming = { kind: 'comment'; event: CommentEvent } | { kind: 'followed'; igsid: string }

type Obj = Record<string, unknown>
const obj = (value: unknown): Obj => (value && typeof value === 'object' ? (value as Obj) : {})
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

function comment(change: Obj): Incoming[] {
  if (change.field !== 'comments') return []
  const value = obj(change.value)
  const commentId = str(value.comment_id) || str(value.id)
  const event = { commentId, mediaId: str(obj(value.media).id), fromId: str(obj(value.from).id), text: str(value.text) }
  return event.commentId && event.mediaId && event.fromId ? [{ kind: 'comment', event }] : []
}

function messaging(item: Obj): Incoming[] {
  const igsid = str(obj(item.sender).id)
  if (!igsid) return []
  if (str(obj(item.postback).payload) === FOLLOWED) return [{ kind: 'followed', igsid }]
  const message = obj(item.message)
  if (message.is_echo !== true && isDone(str(message.text))) return [{ kind: 'followed', igsid }]
  return []
}

export function parse(body: unknown): Incoming[] {
  return arr(obj(body).entry).flatMap((entry) => {
    const e = obj(entry)
    return [...arr(e.changes).flatMap((c) => comment(obj(c))), ...arr(e.messaging).flatMap((m) => messaging(obj(m)))]
  })
}
