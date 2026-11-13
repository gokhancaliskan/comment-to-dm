import type { Env } from './env'
import type { Member, Store } from './store'

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function buildSummary(members: Member[], errors: string[]): { subject: string; html: string } | null {
  if (members.length === 0 && errors.length === 0) return null
  const subject = `comment-to-dm: ${plural(members.length, 'new member')}${errors.length ? `, ${plural(errors.length, 'error')}` : ''}`
  const list = members
    .map((m) => `<li><a href="https://www.instagram.com/${encodeURIComponent(m.username)}/">@${escape(m.username)}</a></li>`)
    .join('')
  const warning = errors.length
    ? `<p>⚠️ ${plural(errors.length, 'error')} today. Last: ${escape(errors[errors.length - 1] ?? '')}</p>`
    : ''
  const intro = members.length ? '<p>Followed and received the reward today:</p>' : ''
  return { subject, html: `${intro}<ul>${list}</ul>${warning}` }
}

export async function sendSummary(
  env: Pick<Env, 'RESEND_API_KEY' | 'SUMMARY_TO' | 'SUMMARY_FROM'>,
  store: Store,
  now: Date,
  http: typeof fetch = fetch,
): Promise<'sent' | 'empty' | 'off'> {
  if (!env.RESEND_API_KEY || !env.SUMMARY_TO || !env.SUMMARY_FROM) return 'off'
  const { members, errors } = await store.since(await store.lastSummary())
  const summary = buildSummary(members, errors)
  if (summary) {
    const res = await http('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.SUMMARY_FROM, to: [env.SUMMARY_TO], subject: summary.subject, html: summary.html }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}`)
  }
  await store.setLastSummary(now.toISOString())
  return summary ? 'sent' : 'empty'
}
