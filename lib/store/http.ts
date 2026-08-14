import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "@/lib/store/db";

/** Map a store write failure to a 503, or return null so the caller rethrows. */
export function jsonFromStoreError(err: unknown): NextResponse | null {
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      {
        error: "Community writes are unavailable until the site database is connected.",
      },
      { status: 503 },
    );
  }
  return null;
}
