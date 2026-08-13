import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILES = 6;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Accept community photo uploads (multipart, field name "files") and return the
 * URLs they can be served from.
 *
 * Photos go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, and to
 * /public/uploads otherwise so `next dev` and self-hosted `next start` keep
 * working with no cloud account.
 *
 * Note the ceiling: a Vercel function request body maxes out at 4.5 MB total,
 * so MAX_FILES × MAX_BYTES is not reachable there in a single request. Raising
 * these limits means moving to a client upload (`upload()` from
 * `@vercel/blob/client`), which streams past the function entirely.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} photos allowed` }, { status: 400 });
  }

  // Validate everything before writing, so a bad file late in the batch can't
  // leave half the upload persisted.
  for (const file of files) {
    if (!EXT_BY_TYPE[file.type]) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP or GIF images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Each photo must be under 4 MB" }, { status: 400 });
    }
  }

  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (!useBlob) await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${EXT_BY_TYPE[file.type]}`;
    if (useBlob) {
      const blob = await put(`uploads/${name}`, file, {
        access: "public",
        contentType: file.type,
      });
      urls.push(blob.url);
    } else {
      await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
      urls.push(`/uploads/${name}`);
    }
  }

  return NextResponse.json({ urls }, { status: 201 });
}
