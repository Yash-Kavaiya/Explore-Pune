import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { PlaceRequest, Review } from "@/lib/types";

/**
 * Tiny JSON document store. This is the single seam that the repositories sit
 * on — they never touch a backend directly, they just call `readDb`/`mutate`.
 *
 * Two drivers back it:
 *   - `redis`, used whenever Redis credentials are present. This is what runs
 *     on Vercel, where the filesystem is read-only and per-instance.
 *   - `file`, an on-disk `data/db.json`, used for local dev and self-hosting.
 *
 * The driver is chosen once from the environment, so nothing above this file
 * has to know which one is live.
 */

export type Database = {
  requests: PlaceRequest[];
  reviews: Review[];
  /** placeSlug -> view count */
  views: Record<string, number>;
};

const EMPTY: Database = { requests: [], reviews: [], views: {} };

/** Fill in any missing top-level keys so callers always get a whole Database. */
function hydrate(parsed: Partial<Database> | null | undefined): Database {
  if (!parsed) return structuredClone(EMPTY);
  return {
    requests: parsed.requests ?? [],
    reviews: parsed.reviews ?? [],
    views: parsed.views ?? {},
  };
}

type Driver = {
  read(): Promise<Database>;
  write(db: Database): Promise<void>;
};

// --- file driver ----------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function fileDriver(): Driver {
  return {
    async read() {
      try {
        const raw = await fs.readFile(DB_FILE, "utf8");
        return hydrate(JSON.parse(raw) as Partial<Database>);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
        throw err;
      }
    },
    async write(db) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      // Commit atomically (write temp, then rename) so a crash mid-write can't
      // leave a half-serialized file behind.
      const tmp = `${DB_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
      await fs.rename(tmp, DB_FILE);
    },
  };
}

// --- redis driver ---------------------------------------------------------

const REDIS_KEY = "explorepune:db";

/**
 * Vercel's Upstash integration injects `KV_REST_API_*`; a store connected
 * outside that integration uses Upstash's own `UPSTASH_REDIS_REST_*` names.
 * Accept either so the app works however the store was provisioned.
 */
function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function redisDriver(credentials: { url: string; token: string }): Driver {
  const redis = new Redis(credentials);
  return {
    async read() {
      // The REST client parses JSON responses for us.
      return hydrate(await redis.get<Partial<Database>>(REDIS_KEY));
    },
    async write(db) {
      await redis.set(REDIS_KEY, db);
    },
  };
}

// --- unconfigured driver --------------------------------------------------

/**
 * Deployed without a Redis store. Reads degrade to empty so pages still
 * render, but writes fail loudly rather than dying on a read-only filesystem
 * with an opaque EROFS.
 */
function unconfiguredDriver(): Driver {
  return {
    async read() {
      return structuredClone(EMPTY);
    },
    async write() {
      throw new Error(
        "No database configured. Connect a Redis store to this Vercel project " +
          "and expose KV_REST_API_URL and KV_REST_API_TOKEN — see DEPLOYMENT.md.",
      );
    },
  };
}

// --- driver selection -----------------------------------------------------

let driver: Driver | undefined;

function activeDriver(): Driver {
  if (driver) return driver;
  const credentials = redisCredentials();
  if (credentials) driver = redisDriver(credentials);
  else if (process.env.VERCEL) driver = unconfiguredDriver();
  else driver = fileDriver();
  return driver;
}

/** True when writes will actually persist, for callers that want to degrade. */
export function isPersistent(): boolean {
  return redisCredentials() !== null || !process.env.VERCEL;
}

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDb(): Promise<Database> {
  return activeDriver().read();
}

/**
 * Read-modify-write the database under a serialized queue. `mutator` may
 * return a value that is forwarded to the caller (e.g. the created entity).
 *
 * The queue only serializes writes within one process, which is all the file
 * driver needs. Across serverless instances two concurrent mutations can still
 * interleave; at this app's write volume that trade is worth the simplicity of
 * a single JSON document.
 */
export async function mutate<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const store = activeDriver();
    const db = await store.read();
    const result = await mutator(db);
    await store.write(db);
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
