/**
 * Clerk feature gating — keeps `pnpm verify`/CI sane without real Dashboard keys,
 * while real `pk_*` / `sk_*` values unlock full middleware + provider wiring.
 */

export function clerkPublishableKeyOrNull(): string | null {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  if (!pk || /PLACEHOLDER/i.test(pk)) return null
  if (!pk.startsWith("pk_")) return null
  return pk
}

export function isClerkMiddlewareEnabled(): boolean {
  const sk = process.env.CLERK_SECRET_KEY?.trim()
  if (!sk || !clerkPublishableKeyOrNull()) return false
  if (/PLACEHOLDER/i.test(sk)) return false
  return sk.startsWith("sk_")
}
