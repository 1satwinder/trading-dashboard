import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import { app } from './app'

// Local dev only: load secrets from .env.local. In production (Netlify
// Functions), env vars are injected by the platform and this file isn't used
// at all — netlify/functions/api.ts mounts `app` directly.
config({ path: '.env.local' })

const port = Number(process.env.PORT) || 8787
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[bff] listening on http://localhost:${info.port}`)
})
