/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "test-secret";

async function setup() {
  const base = convexTest(schema, modules);
  const owner = base.withIdentity({ subject: "owner", email: "owner@example.com" });
  const other = base.withIdentity({ subject: "other", email: "other@example.com" });
  await owner.mutation(api.users.store, {});
  await other.mutation(api.users.store, {});

  const ownProject = await owner.mutation(api.projects.create, { name: "Propio" });
  const ownTask = await owner.mutation(api.tasks.create, {
    projectId: ownProject._id,
    title: "Mía",
  });
  const otherProject = await other.mutation(api.projects.create, { name: "Ajeno" });
  const otherTask = await other.mutation(api.tasks.create, {
    projectId: otherProject._id,
    title: "Ajena",
  });

  const ownerToken = await base.run(async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.email === "owner@example.com")!.tokenIdentifier;
  });
  vi.stubEnv("MCP_CONVEX_SECRET", SECRET);
  vi.stubEnv("MCP_USER_TOKEN_IDENTIFIER", ownerToken);

  return { base, ownTask, otherTask };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mcp.listProjects", () => {
  test("returns only the MCP user's projects", async () => {
    const { base } = await setup();
    const projects = await base.query(api.mcp.listProjects, { secret: SECRET });
    expect(projects.map((p) => p.name)).toEqual(["Propio"]);
    expect(projects[0].tasks.map((t) => t.title)).toEqual(["Mía"]);
  });

  test("rejects a wrong secret", async () => {
    const { base } = await setup();
    await expect(base.query(api.mcp.listProjects, { secret: "nope" })).rejects.toThrow(
      /NOT_AUTHENTICATED/
    );
  });

  test("is closed when the secret is not configured", async () => {
    const { base } = await setup();
    vi.stubEnv("MCP_CONVEX_SECRET", "");
    await expect(base.query(api.mcp.listProjects, { secret: "" })).rejects.toThrow(
      /NOT_AUTHENTICATED/
    );
  });

  test("fails when the configured user does not exist", async () => {
    const { base } = await setup();
    vi.stubEnv("MCP_USER_TOKEN_IDENTIFIER", "missing|user");
    await expect(base.query(api.mcp.listProjects, { secret: SECRET })).rejects.toThrow(
      /MCP user not found/
    );
  });
});

describe("mcp.getTask", () => {
  test("returns an own task with its project name", async () => {
    const { base, ownTask } = await setup();
    const result = await base.query(api.mcp.getTask, { secret: SECRET, taskId: ownTask._id });
    expect(result?.task.title).toBe("Mía");
    expect(result?.project.name).toBe("Propio");
  });

  test("returns null for another user's task", async () => {
    const { base, otherTask } = await setup();
    expect(
      await base.query(api.mcp.getTask, { secret: SECRET, taskId: otherTask._id })
    ).toBeNull();
  });

  test("rejects a wrong secret", async () => {
    const { base, ownTask } = await setup();
    await expect(
      base.query(api.mcp.getTask, { secret: "nope", taskId: ownTask._id })
    ).rejects.toThrow(/NOT_AUTHENTICATED/);
  });
});
