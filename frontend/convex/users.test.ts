/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("users.me", () => {
  test("returns null for anonymous callers", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.users.me, {})).toBeNull();
  });

  test("returns null when the authenticated user has no record yet", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "user-a", email: "a@example.com" });
    expect(await a.query(api.users.me, {})).toBeNull();
  });

  test("returns only _id and email once stored", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "user-a", email: "a@example.com" });
    const id = await a.mutation(api.users.store, {});

    expect(await a.query(api.users.me, {})).toEqual({
      _id: id,
      email: "a@example.com",
    });
  });

  test("each caller sees their own record, not another user's", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "user-a", email: "a@example.com" });
    const b = t.withIdentity({ subject: "user-b", email: "b@example.com" });
    const idA = await a.mutation(api.users.store, {});
    const idB = await b.mutation(api.users.store, {});

    expect((await a.query(api.users.me, {}))?._id).toBe(idA);
    expect((await b.query(api.users.me, {}))?._id).toBe(idB);
    expect(idA).not.toBe(idB);
  });
});

describe("users.store", () => {
  test("rejects anonymous callers with NOT_AUTHENTICATED", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.store, {})).rejects.toThrow(
      "NOT_AUTHENTICATED"
    );
  });

  test("creates a user with token, email and createdAt", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "user-a", email: "a@example.com" });
    const id = await a.mutation(api.users.store, {});

    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.email).toBe("a@example.com");
    expect(user?.tokenIdentifier).toContain("user-a");
    expect(user?.createdAt).toBeTypeOf("number");
  });

  test("is idempotent: repeated calls return the same id without duplicates", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "user-a", email: "a@example.com" });
    const first = await a.mutation(api.users.store, {});
    const second = await a.mutation(api.users.store, {});

    expect(second).toBe(first);
    const all = await t.run((ctx) => ctx.db.query("users").collect());
    expect(all).toHaveLength(1);
  });

  test("falls back to an empty email when the identity has none", async () => {
    const t = convexTest(schema, modules);
    const a = t.withIdentity({ subject: "no-email" });
    const id = await a.mutation(api.users.store, {});

    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.email).toBe("");
  });

  test("distinct identities get distinct records", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: "user-a" }).mutation(api.users.store, {});
    await t.withIdentity({ subject: "user-b" }).mutation(api.users.store, {});

    const all = await t.run((ctx) => ctx.db.query("users").collect());
    expect(all).toHaveLength(2);
  });
});
