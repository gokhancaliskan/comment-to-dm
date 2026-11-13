import { describe, expect, it } from 'vitest'
import { challenge, signed } from '../src/verify'

const SIGNATURES: Record<string, string> = {
  s3cret: 'sha256=0703467d8f49f6f0cb82c36a61fe719edda2342e4a92e1810a5fe268fa362834',
  other: 'sha256=dbfc47f4f66878705438f36be5254e415545a11566f234d33c4429b967541fd4',
}
const sign = (_body: string, secret: string) => SIGNATURES[secret] ?? ''

describe('challenge', () => {
  it('echoes the challenge when the token matches', async () => {
    const url = new URL('https://x/webhook?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=42')
    const res = challenge(url, 'abc')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('42')
  })
  it('rejects a wrong token', () => {
    const url = new URL('https://x/webhook?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42')
    expect(challenge(url, 'abc').status).toBe(403)
  })
})

describe('signed', () => {
  const body = '{"object":"instagram"}'
  it('accepts a valid signature', async () => {
    expect(await signed(body, sign(body, 's3cret'), 's3cret')).toBe(true)
  })
  it('rejects a signature made with another secret', async () => {
    expect(await signed(body, sign(body, 'other'), 's3cret')).toBe(false)
  })
  it('rejects a missing or malformed header', async () => {
    expect(await signed(body, null, 's3cret')).toBe(false)
    expect(await signed(body, 'md5=abc', 's3cret')).toBe(false)
  })
})
