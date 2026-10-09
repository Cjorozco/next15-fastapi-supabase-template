/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, afterEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { resetDemoData } from "./demo";
import { DEMO_PROJECTS } from "./lib/demoData";

const modules = import.meta.glob("./**/*.ts");
const DEMO_TOKEN = "https://x.supabase.co/auth/v1|demo-sub";

async function seedOtherUser(t: ReturnType<typeof convexTest>) {
  const other = t.withIdentity({ subject: "other", email: "other@example.com" });
  await other.mutation(api.users.store, {});
  const project = await other.mutation(api.projects.createWithTasks, {
    name: "Proyecto ajeno",
    tasks: [{ title: "Tarea ajena", position: 0 }],
  });
  return { other, project };
}

describe("demo seed data", () => {
  test("3 projects, 8-12 tasks each, mixed states, 2-3 assignees", () => {
    expect(DEMO_PROJECTS).toHaveLength(3);
    for (const p of DEMO_PROJECTS) {
      expect(p.tasks.length).toBeGreaterThanOrEqual(8);
      expect(p.tasks.length).toBeLessThanOrEqual(12);
      expect(new Set(p.tasks.map((t) => t.status))).toEqual(
        new Set(["todo", "in_progress", "done"])
      );
      const assignees = new Set(p.tasks.map((t) => t.assignee));
      expect(assignees.size).toBeGreaterThanOrEqual(2);
      expect(assignees.size).toBeLessThanOrEqual(3);
    }
  });
});

describe("resetDemoData", () => {
  test("creates the demo user and seeds projects when empty", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));

    const projects = await t.run((ctx) => ctx.db.query("projects").collect());
    expect(projects).toHaveLength(3);
    const tasks = await t.run((ctx) => ctx.db.query("tasks").collect());
    expect(tasks.length).toBe(DEMO_PROJECTS.reduce((n, p) => n + p.tasks.length, 0));
    expect(tasks.every((x) => x.isCompleted === (x.status === "done"))).toBe(true);
  });

  test("restores a mutated demo account and is idempotent", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));
    await t.run(async (ctx) => {
      for (const task of await ctx.db.query("tasks").collect()) {
        await ctx.db.delete(task._id);
      }
    });
    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));
    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));

    expect(await t.run((ctx) => ctx.db.query("projects").collect())).toHaveLength(3);
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(1);
  });

  test("does not touch another user's projects or tasks", async () => {
    const t = convexTest(schema, modules);
    const { other, project } = await seedOtherUser(t);
    const before = {
      users: await t.run((ctx) => ctx.db.query("users").collect()),
      project: await t.run((ctx) => ctx.db.get(project._id)),
      tasks: await t.run((ctx) =>
        ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
      ),
    };

    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));
    await t.run((ctx) => resetDemoData(ctx, DEMO_TOKEN, "demo@example.com"));

    const otherUser = before.users[0];
    expect(await t.run((ctx) => ctx.db.get(otherUser._id))).toEqual(otherUser);
    expect(await t.run((ctx) => ctx.db.get(project._id))).toEqual(before.project);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
      )
    ).toEqual(before.tasks);

    // El otro usuario sigue viendo solo lo suyo.
    const list = await other.query(api.projects.list, {});
    expect(list.map((p) => p.name)).toEqual(["Proyecto ajeno"]);
  });
});

describe("demo.reset (internal)", () => {
  const original = process.env.DEMO_TOKEN_IDENTIFIER;
  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_TOKEN_IDENTIFIER;
    else process.env.DEMO_TOKEN_IDENTIFIER = original;
  });

  test("is a no-op when DEMO_TOKEN_IDENTIFIER is not configured", async () => {
    delete process.env.DEMO_TOKEN_IDENTIFIER;
    const t = convexTest(schema, modules);
    const { other } = await seedOtherUser(t);
    expect(await t.mutation(internal.demo.reset, {})).toBeNull();
    expect(await t.run((ctx) => ctx.db.query("projects").collect())).toHaveLength(1);
    void other;
  });

  test("seeds only the configured demo user", async () => {
    process.env.DEMO_TOKEN_IDENTIFIER = DEMO_TOKEN;
    const t = convexTest(schema, modules);
    const { other } = await seedOtherUser(t);
    expect(await t.mutation(internal.demo.reset, {})).toEqual({ projects: 3 });
    expect(await t.run((ctx) => ctx.db.query("projects").collect())).toHaveLength(4);
    expect((await other.query(api.projects.list, {})).map((p) => p.name)).toEqual([
      "Proyecto ajeno",
    ]);
  });
});
