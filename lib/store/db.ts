import { promises as fs } from "node:fs";
import path from "node:path";
import type { PlaceRequest, Review } from "@/lib/types";

/**
 * Tiny on-disk JSON store. This is the single seam that a real database
 * (Firebase/Supabase) would replace later — the repositories above it never
 * touch `fs` directly.
 *
 * Writes are serialized through an in-process queue and committed atomically
 * (write temp file, then rename) so concurrent route handlers can't corrupt
 * the file. Good enough for a single-operator, local-first app.
 */

export type Database = {
  requests: PlaceRequest[];
  reviews: Review[];
  /** placeSlug -> view count */
  views: Record<string, number>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY: Database = { requests: [], reviews: [], views: {} };

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    return {
      requests: parsed.requests ?? [],
      reviews: parsed.reviews ?? [],
      views: parsed.views ?? {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw err;
  }
}

async function persist(db: Database): Promise<void> {
  await ensureDir();
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/**
 * Read-modify-write the database under the serialized queue. `mutator` may
 * return a value that is forwarded to the caller (e.g. the created entity).
 */
export async function mutate<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await readDb();
    const result = await mutator(db);
    await persist(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  // Keep the queue alive regardless of this op's success.
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
