import { cookies } from "next/headers";
import { createHash } from "node:crypto";

/**
 * Lightweight admin gate for the local-first app. There are no user accounts;
 * a single shared passphrase (ADMIN_PASSPHRASE) unlocks /admin and the
 * moderation APIs. The cookie stores a hash of the passphrase, not the
 * passphrase itself. This is NOT real authentication — it's a convenience gate
 * for a single operator and should be hardened before any multi-user use.
 */

export const ADMIN_COOKIE = "ep_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/** Falls back to "admin" when unset so the dashboard is reachable out of the box. */
function passphrase(): string {
  return process.env.ADMIN_PASSPHRASE || "admin";
}

export function adminCookieValue(): string {
  return createHash("sha256").update(passphrase()).digest("hex");
}

export function checkPassphrase(input: string): boolean {
  return input === passphrase();
}

/** Read the cookie (server component or route handler) and validate it. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminCookieValue();
}
