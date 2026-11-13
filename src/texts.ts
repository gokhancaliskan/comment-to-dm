import type { Message } from './graph'

export const FOLLOWED = 'FOLLOWED'

export const withButton = (text: string): Message => ({
  attachment: {
    type: 'template',
    payload: { template_type: 'button', text, buttons: [{ type: 'postback', title: 'I followed ✅', payload: FOLLOWED }] },
  },
})

export const texts = {
  ask: (handle: string) => `Hey! 👋 One quick step: follow @${handle}, then tap the button below.`,
  notYet: (handle: string) => `Looks like you're not following yet 👀 Follow @${handle} and tap the button again.`,
  consent: 'Almost there! Reply "done" here and I\'ll check right away 👀',
  retry: "Couldn't check just now, tap again in a minute.",
  welcome: (reward: string) => `You're in! 🙌\n${reward}`,
  again: (reward: string) => `Here it is again 💛\n${reward}`,
}

export const publicReplies = ['Check your DMs 📬', 'Sent you a DM 👋', "DM'd you the link 👀"] as const
