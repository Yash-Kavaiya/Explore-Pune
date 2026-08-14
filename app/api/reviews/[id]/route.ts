import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { jsonFromStoreError } from "@/lib/store/http";
import { deleteReview } from "@/lib/store/reviews.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Remove a review — admin only (moderation). */
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const removed = await deleteReview(id);
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const res = jsonFromStoreError(err);
    if (res) return res;
    throw err;
  }
}
