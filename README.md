# comment-to-dm

A free, self-hosted Instagram comment-to-DM automation with a follow check. It runs on a Cloudflare Worker and talks to the official Meta Graph API, so there is no third-party tool between you and your followers.

1. Someone comments your keyword on a post whose caption says "Comment KEYWORD".
2. They get a DM with an "I followed ✅" button, and a short public reply under their comment.
3. When they tap the button, the Worker asks Instagram whether they follow you.
4. Followers receive your reward message. Everyone else is asked to follow and tap again.
5. Optionally, a daily email lists who received the reward that day.

Made by [Hotan Games](https://hotangames.com), where it hands out playtest invites.

## Status

The whole flow has been run end to end with the Meta app in development mode. In that mode Meta only delivers events for accounts that have a role on your app. To serve the public you need Meta business verification, App Review with Advanced Access, and Live mode. That is Meta's process and it takes days to weeks.

## What you need

- An Instagram professional account connected to a Facebook Page.
- A Meta app with the "Manage messaging & content on Instagram" use case (API setup with Unified login) and "Manage everything on your Page".
- A system user in your business portfolio, assigned to the app, the Instagram account and the Page, with a token carrying `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement` and `pages_manage_metadata`.
- A Cloudflare account. The free plan is enough.
- Optional: a [Resend](https://resend.com) API key for the daily summary email.

## Setup

```bash
pnpm install
pnpm wrangler login
pnpm wrangler kv namespace create KV
```

Put the KV namespace id into `wrangler.toml` and fill in `[vars]`:

| Variable | Meaning |
| --- | --- |
| `IG_USER_ID` | Your Instagram account id (the `1784…` number). |
| `PAGE_ID` | The Facebook Page connected to that account. |
| `GRAPH_VERSION` | Graph API version, for example `v27.0`. |
| `HANDLE` | Your Instagram username without `@`. Used in the "follow us" messages. |
| `KEYWORD` | The word people comment. |
| `REWARD` | The message followers receive. Use `\n` for line breaks. |
| `SUMMARY_TO`, `SUMMARY_FROM` | Daily summary addresses. Leave empty to turn the email off. |

Copy `.dev.vars.example` to `.dev.vars` for local use, then upload each secret:

```bash
pnpm wrangler secret put IG_TOKEN
pnpm wrangler secret put APP_SECRET
pnpm wrangler secret put VERIFY_TOKEN
pnpm wrangler secret put RESEND_API_KEY
pnpm deploy
```

- `IG_TOKEN`: the system user token.
- `APP_SECRET`: your Meta app secret. Webhook signatures are checked with it.
- `VERIFY_TOKEN`: any random string. You type the same value into Meta's webhook form.
- `RESEND_API_KEY`: only if you want the summary email.

## Webhooks

Events arrive only when all three subscriptions exist. Missing any one of them fails silently.

1. **App:** Use cases > Instagram API > API setup with Unified login > Configure webhooks. Callback URL `https://<your-worker>/webhook`, your `VERIFY_TOKEN`, and subscribe to `comments`, `messages` and `messaging_postbacks`.
2. **Instagram account:** `POST /{IG_USER_ID}/subscribed_apps?subscribed_fields=comments,messages,messaging_postbacks` with the system user token.
3. **Page:** `POST /{PAGE_ID}/subscribed_apps?subscribed_fields=feed` with the Page token. Button taps do not arrive without it.

On the phone, turn on Settings > Messages > Connected tools > Allow access to messages.

## Using it on a post

Put "Comment KEYWORD" in the caption, with your own keyword. The Worker ignores posts without that call and comments that do not contain the keyword as a separate word.

## Good to know

- The follow status (`is_user_follow_business`) is only returned for a Page token. The Worker fetches one with the system user token from `/{PAGE_ID}?fields=access_token`.
- Instagram sends button taps only to the app that owns the conversation. If another automation tool is connected to the same account, the two will take conversations from each other for about 24 hours at a time.
- If Meta refuses the profile lookup for lack of consent, the Worker asks the person to reply "done" and checks again on that message.
- Wording lives in `src/texts.ts`.

## Data

Stored in Workers KV: the Instagram-scoped user id and username of people who received the reward (kept until you delete them), handled comment ids (8 days), a daily list and error notes (3 days), and post captions (10 minutes). If you run this for the public, publish a privacy policy and a data deletion path; Meta's App Review asks for both.

## Development

```bash
pnpm test
pnpm typecheck
pnpm dev
pnpm wrangler tail
```

## License

MIT. Not affiliated with or endorsed by Meta or Instagram.
