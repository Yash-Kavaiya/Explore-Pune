import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createRequest, listRequests } from "@/lib/store/requests.repo";
import { placeRequestInputSchema, type RequestStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List submissions — admin only (the public never sees pending requests). */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = new URL(request.url).searchParams.get("status") as RequestStatus | null;
  const requests = await listRequests(status ?? undefined);
  return NextResponse.json({ requests });
}

/** Submit a new place suggestion — public. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = placeRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const created = await createRequest(parsed.data);
  return NextResponse.json({ request: created }, { status: 201 });
}
