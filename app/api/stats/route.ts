import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getStats, incrementView } from "@/lib/store/stats.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin dashboard stats. Admin only. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await getStats();
  return NextResponse.json({ stats });
}

/** Record a place-detail view. Public, fire-and-forget. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : null;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  const views = await incrementView(slug);
  return NextResponse.json({ views });
}
