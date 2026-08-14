import { describe, expect, it } from "vitest";
import { DatabaseNotConfiguredError } from "@/lib/store/db";
import { jsonFromStoreError } from "@/lib/store/http";

describe("jsonFromStoreError", () => {
  it("maps a missing database to 503", async () => {
    const res = jsonFromStoreError(new DatabaseNotConfiguredError());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    await expect(res!.json()).resolves.toMatchObject({
      error: expect.stringContaining("database"),
    });
  });

  it("leaves other errors to the caller", () => {
    expect(jsonFromStoreError(new Error("disk full"))).toBeNull();
  });
});
