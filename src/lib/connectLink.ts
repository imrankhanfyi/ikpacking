/**
 * Helpers for the "connect link" / QR feature.
 * Pure functions — no DOM, no side-effects — so they are trivially testable.
 */

/**
 * Build the connect link that encodes the sync token as a URL fragment.
 * e.g. "https://pack.imrankhan.fyi/#token=my-secret-token"
 */
export function buildConnectLink(origin: string, token: string): string {
  return `${origin}/#token=${encodeURIComponent(token)}`
}

/**
 * Parse a sync token from a URL hash string (e.g. `window.location.hash`).
 *
 * Handles:
 *   "#token=abc"            → "abc"
 *   "#token=abc%20d"        → "abc d"   (decoded)
 *   "#token=x&y=z"          → "x"       (only the token param)
 *   "#token="               → null      (empty value treated as absent)
 *   "#foo=bar"              → null      (no token param)
 *   ""                      → null
 */
export function parseTokenFromHash(hash: string): string | null {
  if (!hash || hash.length < 2) return null
  // Strip leading '#', then parse as URLSearchParams
  const params = new URLSearchParams(hash.slice(1))
  const raw = params.get('token')
  if (!raw) return null
  const decoded = decodeURIComponent(raw)
  return decoded.length > 0 ? decoded : null
}
