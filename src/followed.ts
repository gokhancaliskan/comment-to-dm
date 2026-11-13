import type { Deps } from './comments'
import { isConsentError, type Profile } from './graph'
import { texts, withButton } from './texts'

export async function handleFollowed(igsid: string, deps: Deps): Promise<string> {
  const { graph, store, env } = deps
  let profile: Profile
  try {
    profile = await graph.profile(igsid)
  } catch (error) {
    if (isConsentError(error)) {
      await graph.send(igsid, { text: texts.consent })
      return 'consent'
    }
    await store.error(deps.now(), `profile: ${error instanceof Error ? error.message : String(error)}`)
    await graph.send(igsid, withButton(texts.retry))
    return 'retry'
  }
  if (!profile.follows) {
    await graph.send(igsid, withButton(texts.notYet(env.HANDLE)))
    return 'not-following'
  }
  await graph.send(igsid, { text: texts.welcome(env.REWARD) })
  if (!(await store.member(igsid))) await store.addMember(igsid, profile.username, deps.now())
  return 'welcomed'
}
