import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminCookieValue,
  checkPassphrase,
} from "@/lib/admin-auth";
import { adminVerifySchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adminVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the admin passphrase" }, { status: 400 });
  }

  if (!checkPassphrase(parsed.data.passphrase)) {
    return NextResponse.json({ error: "Incorrect passphrase" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

/** Sign out of the admin session. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
