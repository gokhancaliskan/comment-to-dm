export type Kv = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  list(options: { prefix: string }): Promise<{ keys: { name: string }[] }>
}

export type Env = {
  KV: Kv
  IG_TOKEN: string
  APP_SECRET: string
  VERIFY_TOKEN: string
  IG_USER_ID: string
  PAGE_ID: string
  GRAPH_VERSION: string
  HANDLE: string
  KEYWORD: string
  REWARD: string
  RESEND_API_KEY?: string
  SUMMARY_TO?: string
  SUMMARY_FROM?: string
}
