/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const base = convexTest(schema, modules);
  const owner = base.withIdentity({ subject: "owner", email: "owner@example.com" });
  const intruder = base.withIdentity({ subject: "intruder", email: "x@example.com" });
  await owner.mutation(api.users.store, {});
  await intruder.mutation(api.users.store, {});
  const project = await owner.mutation(api.projects.create, { name: "Propio" });
  const task = await owner.mutation(api.tasks.create, { projectId: project._id, title: "Mía" });
  return { base, owner, intruder, task };
}

describe("tasks.get", () => {
  test("returns the owner's task with its project name", async () => {
    const { owner, task } = await setup();
    const result = await owner.query(api.tasks.get, { taskId: task._id });
    expect(result?.task.title).toBe("Mía");
    expect(result?.project.name).toBe("Propio");
  });

  test("returns null for another user's task", async () => {
    const { intruder, task } = await setup();
    expect(await intruder.query(api.tasks.get, { taskId: task._id })).toBeNull();
  });

  test("returns null for an id that is not a task id", async () => {
    const { owner } = await setup();
    const project = await owner.mutation(api.projects.create, { name: "Otro" });
    expect(await owner.query(api.tasks.get, { taskId: "no-es-un-id" })).toBeNull();
    expect(await owner.query(api.tasks.get, { taskId: project._id })).toBeNull();
  });

  test("projects.get returns null for an id that is not a project id", async () => {
    const { owner, task } = await setup();
    expect(await owner.query(api.projects.get, { projectId: "no-es-un-id" })).toBeNull();
    expect(await owner.query(api.projects.get, { projectId: task._id })).toBeNull();
  });

  test("rejects anonymous callers", async () => {
    const { base, task } = await setup();
    await expect(base.query(api.tasks.get, { taskId: task._id })).rejects.toThrow(
      /NOT_AUTHENTICATED/
    );
    await expect(base.query(api.tasks.get, { taskId: "no-es-un-id" })).rejects.toThrow(
      /NOT_AUTHENTICATED/
    );
  });
});
