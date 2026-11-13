import { describe, expect, it } from 'vitest'
import { parse } from '../src/parse'

describe('parse', () => {
  it('reads Unified login comment changes with comment_id', () => {
    const body = {
      object: 'instagram',
      entry: [{ id: '178', changes: [{ field: 'comments', value: { comment_id: 'c1', text: 'TEST', from: { id: 'u1', username: 'ayse' }, media: { id: 'm1' } } }] }],
    }
    expect(parse(body)).toEqual([{ kind: 'comment', event: { commentId: 'c1', mediaId: 'm1', fromId: 'u1', text: 'TEST' } }])
  })

  it('also accepts id as the comment id', () => {
    const body = { entry: [{ changes: [{ field: 'comments', value: { id: 'c2', text: 'test', from: { id: 'u2' }, media: { id: 'm2' } } }] }] }
    expect(parse(body)[0]).toEqual({ kind: 'comment', event: { commentId: 'c2', mediaId: 'm2', fromId: 'u2', text: 'test' } })
  })

  it('turns the FOLLOWED postback and a done reply into followed events', () => {
    const body = {
      entry: [
        {
          messaging: [
            { sender: { id: 'u1' }, postback: { payload: 'FOLLOWED', title: 'I followed ✅' } },
            { sender: { id: 'u2' }, message: { text: 'done' } },
            { sender: { id: 'u3' }, message: { text: 'hello' } },
            { sender: { id: '178' }, message: { text: 'done', is_echo: true } },
          ],
        },
      ],
    }
    expect(parse(body)).toEqual([
      { kind: 'followed', igsid: 'u1' },
      { kind: 'followed', igsid: 'u2' },
    ])
  })

  it('ignores junk', () => {
    expect(parse(null)).toEqual([])
    expect(parse({ entry: 'x' })).toEqual([])
  })
})
