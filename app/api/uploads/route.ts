import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILES = 6;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Accept community photo uploads (multipart, field name "files") and write them
 * to /public/uploads so they are served statically. Local-first: this persists
 * on disk on the host machine (works in `next dev` / self-hosted `next start`).
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

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const urls: string[] = [];

  for (const file of files) {
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP or GIF images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Each photo must be under 5 MB" }, { status: 400 });
    }
    const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
    urls.push(`/uploads/${name}`);
  }

  return NextResponse.json({ urls }, { status: 201 });
}
