import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { timingSafeEqual } from 'hono/utils/buffer'
import { ProviderError } from './errors'

/**
 * Session auth for the BFF's **write** endpoints (ADR-024).
 *
 * There's one shared Alpaca paper account and no user model, so this isn't a
 * login system — it's a single owner passcode exchanged for a signed session
 * cookie. Only order placement and cancellation are gated; every read stays
 * public so the deployed demo is fully browsable without signing in.
 *
 * The cookie is a JWT signed with `SESSION_SECRET` carrying nothing but an
 * expiry, so sessions need no server-side storage — which matters on Netlify,
 * where each function invocation may hit a different instance.
 */

const SESSION_COOKIE = 'xt_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

/** Stated on both sign and verify so the two can never drift apart. */
const SESSION_ALGORITHM = 'HS256'

/** Slows down guessing without needing per-instance attempt tracking. */
const FAILED_LOGIN_DELAY_MS = 300

function config(): { passcode: string; secret: string } {
  const passcode = process.env.APP_PASSCODE
  const secret = process.env.SESSION_SECRET
  if (!passcode || !secret) {
    throw new ProviderError(
      500,
      'Server is missing APP_PASSCODE / SESSION_SECRET (see .env.example).',
    )
  }
  return { passcode, secret }
}

/**
 * Cookies marked `Secure` are dropped over plain HTTP, and local dev serves the
 * app on `http://localhost`. Reading the scheme off the request keeps this
 * runtime-agnostic — no `NODE_ENV` check, no knowledge of Netlify.
 */
function isSecureRequest(c: Context): boolean {
  try {
    return new URL(c.req.url).protocol === 'https:'
  } catch {
    return false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Compare a submitted passcode against the configured one, without leaking timing. */
export async function verifyPasscode(input: unknown): Promise<boolean> {
  const { passcode } = config()
  const matches = await timingSafeEqual(passcode, typeof input === 'string' ? input : '')
  if (!matches) await delay(FAILED_LOGIN_DELAY_MS)
  return matches
}

/** Issue a session cookie for the caller. */
export async function createSession(c: Context): Promise<void> {
  const { secret } = config()
  const token = await sign(
    { exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
    secret,
    SESSION_ALGORITHM,
  )

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: isSecureRequest(c),
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    sameSite: 'Lax',
    secure: isSecureRequest(c),
  })
}

/** Whether the request carries a valid, unexpired session cookie. */
export async function hasSession(c: Context): Promise<boolean> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return false

  try {
    const { secret } = config()
    await verify(token, secret, SESSION_ALGORITHM)
    return true
  } catch {
    // Tampered, expired, or the server is misconfigured — all mean "no session".
    return false
  }
}

/** Guard for the write routes: 401 unless a valid session cookie is present. */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  try {
    config()
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : 'Server auth is misconfigured.'
    return c.json({ error: message }, 500)
  }

  if (!(await hasSession(c))) {
    return c.json({ error: 'Sign in to place or cancel orders.' }, 401)
  }

  await next()
}
