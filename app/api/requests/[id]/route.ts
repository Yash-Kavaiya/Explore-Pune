import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { decideRequest, deleteRequest } from "@/lib/store/requests.repo";
import { adminDecisionSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Approve or reject a submission — admin only. */
export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  const updated = await decideRequest(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: updated });
}

/** Delete a submission — admin only. */
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const removed = await deleteRequest(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
