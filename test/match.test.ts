import { describe, expect, it } from 'vitest'
import { isCallout, isDone, pick, wantsKeyword } from '../src/match'

describe('wantsKeyword', () => {
  it('matches the keyword in any case', () => {
    expect(wantsKeyword('TEST', 'test')).toBe(true)
    expect(wantsKeyword('test pls 🙋', 'test')).toBe(true)
    expect(wantsKeyword('Test!', 'test')).toBe(true)
  })
  it('ignores words that only contain the keyword', () => {
    expect(wantsKeyword('latest update', 'test')).toBe(false)
    expect(wantsKeyword('testing this', 'test')).toBe(false)
    expect(wantsKeyword('contest', 'test')).toBe(false)
  })
})

describe('isCallout', () => {
  it('finds the comment call in a caption', () => {
    expect(isCallout("Ad money isn't cheap. Comment TEST to join 🧪", 'test')).toBe(true)
    expect(isCallout('comment "test" below', 'test')).toBe(true)
  })
  it('works with other keywords and treats them literally', () => {
    expect(wantsKeyword('LINK please', 'link')).toBe(true)
    expect(wantsKeyword('blinking', 'link')).toBe(false)
    expect(wantsKeyword('axb', 'a.b')).toBe(false)
    expect(isCallout('Comment LINK for the guide', 'link')).toBe(true)
    expect(isCallout('Comment LINKS', 'link')).toBe(false)
  })
  it('rejects captions without the call', () => {
    expect(isCallout('Guess the game 👀', 'test')).toBe(false)
    expect(isCallout('', 'test')).toBe(false)
  })
})

describe('isDone', () => {
  it('accepts done and followed replies', () => {
    expect(isDone('done')).toBe(true)
    expect(isDone(' Done ✅')).toBe(true)
    expect(isDone('I followed')).toBe(true)
    expect(isDone('followed!')).toBe(true)
  })
  it('rejects other messages', () => {
    expect(isDone('hello')).toBe(false)
    expect(isDone('not done yet')).toBe(false)
  })
})

describe('pick', () => {
  it('uses the random source to choose', () => {
    expect(pick(['a', 'b', 'c'], () => 0)).toBe('a')
    expect(pick(['a', 'b', 'c'], () => 0.99)).toBe('c')
  })
})
