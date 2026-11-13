export function challenge(url: URL, verifyToken: string): Response {
  const params = url.searchParams
  const ok = params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === verifyToken
  return ok ? new Response(params.get('hub.challenge') ?? '') : new Response('forbidden', { status: 403 })
}

export async function signed(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
  const hex = Array.from(mac, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return same(hex, header.slice('sha256='.length))
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
