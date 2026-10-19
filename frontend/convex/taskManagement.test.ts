/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const base = convexTest(schema, modules);
  const owner = base.withIdentity({ subject: "owner", email: "owner@example.com" });
  const intruder = base.withIdentity({ subject: "intruder", email: "x@example.com" });
  await owner.mutation(api.users.store, {});
  await intruder.mutation(api.users.store, {});
  const project = await owner.mutation(api.projects.create, { name: "Proyecto" });
  const task = await owner.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea",
  });
  return { base, owner, intruder, project, task };
}

describe("task status compatibility", () => {
  test("new tasks start as pendiente", async () => {
    const { task } = await setup();
    expect(task.status).toBe("pendiente");
    expect(task.isCompleted).toBe(false);
  });

  test("checkbox keeps status in sync both ways", async () => {
    const { owner, task } = await setup();

    const done = await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: true });
    expect(done.status).toBe("completada");

    const reopened = await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: false });
    expect(reopened.status).toBe("pendiente");
  });

  test("a task without status derives it from the boolean", async () => {
    const { base, owner, project } = await setup();
    await base.run(async (ctx) => {
      await ctx.db.insert("tasks", { projectId: project._id, title: "Vieja", isCompleted: true, position: 5 });
      await ctx.db.insert("tasks", { projectId: project._id, title: "Vieja 2", isCompleted: false, position: 6 });
    });

    const loaded = await owner.query(api.projects.get, { projectId: project._id });
    const byTitle = Object.fromEntries(loaded!.tasks.map((t) => [t.title, t.status]));
    expect(byTitle["Vieja"]).toBe("completada");
    expect(byTitle["Vieja 2"]).toBe("pendiente");
  });
});

describe("tasks.updateTask", () => {
  test("edits every field and returns the normalized task", async () => {
    const { owner, task } = await setup();
    const due = new Date(2030, 0, 15).getTime();

    const updated = await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      title: "  Nuevo título  ",
      status: "en_progreso",
      dueDate: due,
      estimatedHours: 6.5,
      priority: "alta",
      notes: "  Revisar con diseño  ",
    });

    expect(updated).toMatchObject({
      title: "Nuevo título",
      status: "en_progreso",
      isCompleted: false,
      dueDate: due,
      estimatedHours: 6.5,
      priority: "alta",
      notes: "Revisar con diseño",
    });
  });

  test("status completada completes the task and its subtasks; leaving it reopens", async () => {
    const { owner, task } = await setup();
    await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Sub" });

    const done = await owner.mutation(api.tasks.updateTask, { taskId: task._id, status: "completada" });
    expect(done.isCompleted).toBe(true);
    expect(done.subtasks?.every((s) => s.isCompleted)).toBe(true);

    const reopened = await owner.mutation(api.tasks.updateTask, { taskId: task._id, status: "en_progreso" });
    expect(reopened.isCompleted).toBe(false);
    expect(reopened.status).toBe("en_progreso");
  });

  test("null clears optional fields, omitted fields stay untouched", async () => {
    const { owner, task } = await setup();
    await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      dueDate: 1_900_000_000_000,
      estimatedHours: 3,
      priority: "media",
      notes: "nota",
    });

    const cleared = await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      dueDate: null,
      notes: null,
    });
    expect(cleared.dueDate).toBeUndefined();
    expect(cleared.notes).toBeUndefined();
    expect(cleared.estimatedHours).toBe(3);
    expect(cleared.priority).toBe("media");
  });

  test("rejects invalid input", async () => {
    const { owner, task } = await setup();
    await expect(owner.mutation(api.tasks.updateTask, { taskId: task._id, title: "   " })).rejects.toThrow();
    await expect(owner.mutation(api.tasks.updateTask, { taskId: task._id, estimatedHours: -1 })).rejects.toThrow();
    await expect(owner.mutation(api.tasks.updateTask, { taskId: task._id, estimatedHours: Number.NaN })).rejects.toThrow();
    await expect(owner.mutation(api.tasks.updateTask, { taskId: task._id, dueDate: 0 })).rejects.toThrow();
    await expect(
      owner.mutation(api.tasks.updateTask, { taskId: task._id, notes: "x".repeat(5001) })
    ).rejects.toThrow();
  });

  test("refuses to edit another user's task", async () => {
    const { intruder, task } = await setup();
    await expect(
      intruder.mutation(api.tasks.updateTask, { taskId: task._id, title: "Hack" })
    ).rejects.toThrow();
  });
});

describe("projects.updateProject", () => {
  test("updates name and description, clearing the description with an empty string", async () => {
    const { owner, project } = await setup();

    const updated = await owner.mutation(api.projects.updateProject, {
      projectId: project._id,
      name: "  Renombrado ",
      description: " Nueva descripción ",
    });
    expect(updated.name).toBe("Renombrado");
    expect(updated.description).toBe("Nueva descripción");

    const cleared = await owner.mutation(api.projects.updateProject, {
      projectId: project._id,
      description: "",
    });
    expect(cleared.description).toBeUndefined();
    expect(cleared.name).toBe("Renombrado");
  });

  test("rejects empty and duplicate names but allows keeping the own name", async () => {
    const { owner, project } = await setup();
    await owner.mutation(api.projects.create, { name: "Otro" });

    await expect(
      owner.mutation(api.projects.updateProject, { projectId: project._id, name: "  " })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projects.updateProject, { projectId: project._id, name: "Otro" })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projects.updateProject, { projectId: project._id, name: "Proyecto" })
    ).resolves.toMatchObject({ name: "Proyecto" });
  });

  test("refuses to edit another user's project", async () => {
    const { intruder, project } = await setup();
    await expect(
      intruder.mutation(api.projects.updateProject, { projectId: project._id, name: "Robado" })
    ).rejects.toThrow();
  });
});

describe("migrations.backfillTaskFields", () => {
  async function seedLegacy() {
    const { base, project } = await setup();
    await base.run(async (ctx) => {
      await ctx.db.insert("tasks", { projectId: project._id, title: "sin status", isCompleted: false, position: 1 });
      await ctx.db.insert("tasks", { projectId: project._id, title: "hecha", isCompleted: true, position: 2 });
    });
    return { base, project };
  }

  test("fills missing status without touching isCompleted", async () => {
    const { base } = await seedLegacy();

    const result = await base.mutation(internal.migrations.backfillTaskFields, {});
    expect(result.isDone).toBe(true);

    const tasks = await base.run((ctx) => ctx.db.query("tasks").collect());
    const byTitle = Object.fromEntries(tasks.map((t) => [t.title, t]));
    expect(byTitle["sin status"]).toMatchObject({ status: "pendiente", isCompleted: false });
    expect(byTitle["hecha"]).toMatchObject({ status: "completada", isCompleted: true });
  });

  test("is idempotent", async () => {
    const { base } = await seedLegacy();
    const first = await base.mutation(internal.migrations.backfillTaskFields, {});
    const second = await base.mutation(internal.migrations.backfillTaskFields, {});

    expect(first.updated).toBeGreaterThan(0);
    expect(second.updated).toBe(0);
    expect(await base.query(internal.migrations.countTasksPendingBackfill, {})).toMatchObject({ pending: 0 });
  });
});
