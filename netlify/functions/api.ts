import { handle } from 'hono/netlify'
import { app } from '../../server/app'

/**
 * Production entry point for the BFF (see server/app.ts for the routes).
 * `hono/netlify`'s `handle()` adapts the shared Hono app to a Netlify
 * Function (AWS Lambda) handler. Env vars (FINNHUB_API_KEY, ALPACA_*) are
 * injected by Netlify — no dotenv here, unlike the local-dev entry point
 * (server/index.ts). Routed from `/api/*` via the redirect in netlify.toml.
 */
export default handle(app)
