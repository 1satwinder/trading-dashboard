/**
 * Tiny in-memory TTL cache shared by the BFF provider clients.
 *
 * Keeps us under the providers' free-tier rate limits without any external
 * dependency. Process-local (resets on restart); a shared cache only matters
 * once deployed to multiple instances.
 */

interface CacheEntry<T> {
  value: T
  expires: number
}

const store = new Map<string, CacheEntry<unknown>>()

/** Return a cached value if fresh, otherwise run `fn`, cache it, and return it. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await fn()
  store.set(key, { value, expires: Date.now() + ttlMs })
  return value
}

/**
 * Drop cache entries whose key starts with any of the given prefixes. Used after
 * writes (placing/cancelling an order) so the next read reflects the change
 * instead of serving a stale account/positions snapshot.
 */
export function invalidate(...prefixes: string[]): void {
  for (const key of store.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) store.delete(key)
  }
}
