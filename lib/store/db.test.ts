import { afterEach, describe, expect, it } from "vitest";
import {
  DatabaseNotConfiguredError,
  isPersistent,
  mutate,
  resetStoreDriverForTests,
} from "@/lib/store/db";
import { incrementView } from "@/lib/store/stats.repo";

const REDIS_KEYS = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const snapshot = new Map<string, string | undefined>();

function remember(key: string) {
  if (!snapshot.has(key)) snapshot.set(key, process.env[key]);
}

function setEnv(key: string, value: string | undefined) {
  remember(key);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function vercelWithoutRedis() {
  setEnv("VERCEL", "1");
  for (const key of REDIS_KEYS) setEnv(key, undefined);
  resetStoreDriverForTests();
}

afterEach(() => {
  for (const [key, value] of snapshot) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  snapshot.clear();
  resetStoreDriverForTests();
});

describe("isPersistent", () => {
  it("is false on Vercel without Redis credentials", () => {
    vercelWithoutRedis();
    expect(isPersistent()).toBe(false);
  });

  it("is true on Vercel when KV_REST_API_* is set", () => {
    setEnv("VERCEL", "1");
    setEnv("KV_REST_API_URL", "https://example.upstash.io");
    setEnv("KV_REST_API_TOKEN", "token");
    expect(isPersistent()).toBe(true);
  });
});

describe("incrementView", () => {
  it("does not throw when Vercel has no Redis", async () => {
    vercelWithoutRedis();
    await expect(incrementView("shaniwar-wada")).resolves.toBe(0);
  });
});

describe("mutate", () => {
  it("throws DatabaseNotConfiguredError on Vercel without Redis", async () => {
    vercelWithoutRedis();
    await expect(mutate((db) => db)).rejects.toBeInstanceOf(DatabaseNotConfiguredError);
  });
});
