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

describe("projects.createWithTasks planning fields", () => {
  test("stores priority, hours and due date of each task", async () => {
    const { owner } = await setup();
    const due = new Date(2030, 2, 15).getTime();

    const created = await owner.mutation(api.projects.createWithTasks, {
      name: "Con IA",
      tasks: [
        { title: "A", position: 0, priority: "alta", estimatedHours: 1.5, dueDate: due },
        { title: "B", position: 1 },
      ],
    });

    expect(created.tasks[0]).toMatchObject({ priority: "alta", estimatedHours: 1.5, dueDate: due });
    expect(created.tasks[1].priority).toBeUndefined();
    expect(created.tasks[1].estimatedHours).toBeUndefined();
  });

  test("rejects out-of-range hours and invalid dates", async () => {
    const { owner } = await setup();

    await expect(
      owner.mutation(api.projects.createWithTasks, {
        name: "Horas",
        tasks: [{ title: "A", position: 0, estimatedHours: -1 }],
      })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projects.createWithTasks, {
        name: "Fecha",
        tasks: [{ title: "A", position: 0, dueDate: 0 }],
      })
    ).rejects.toThrow();
  });

  test("rejects too many tasks", async () => {
    const { owner } = await setup();
    const tasks = Array.from({ length: 51 }, (_, i) => ({ title: `T${i}`, position: i }));
    await expect(
      owner.mutation(api.projects.createWithTasks, { name: "Muchas", tasks })
    ).rejects.toThrow();
  });
});

describe("project priority, status and due date", () => {
  test("a project created before the new fields loads without them", async () => {
    const { base, owner } = await setup();
    const legacyId = await base.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      return await ctx.db.insert("projects", { ownerId: user!._id, name: "Antiguo" });
    });

    const loaded = await owner.query(api.projects.get, { projectId: legacyId });
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBeUndefined();
    expect(loaded!.priority).toBeUndefined();
    expect(loaded!.dueDate).toBeUndefined();
  });

  test("updateProject stores and clears the new fields", async () => {
    const { owner, project } = await setup();
    const due = new Date(2030, 5, 1).getTime();

    const updated = await owner.mutation(api.projects.updateProject, {
      projectId: project._id,
      priority: "alta",
      status: "en_pausa",
      dueDate: due,
    });
    expect(updated).toMatchObject({ priority: "alta", status: "en_pausa", dueDate: due });

    const cleared = await owner.mutation(api.projects.updateProject, {
      projectId: project._id,
      dueDate: null,
    });
    expect(cleared.dueDate).toBeUndefined();
    expect(cleared.priority).toBe("alta");
  });

  test("updateProject rejects an invalid due date and other users", async () => {
    const { owner, intruder, project } = await setup();
    await expect(
      owner.mutation(api.projects.updateProject, { projectId: project._id, dueDate: -5 })
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.projects.updateProject, { projectId: project._id, status: "completado" })
    ).rejects.toThrow();
  });
});

describe("recurring tasks", () => {
  const TZ = 0;

  test("completing with the checkbox reopens the task with the next due date", async () => {
    const { owner, task } = await setup();
    const sub = await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Paso" });
    const subId = sub.subtasks![0].id;
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "semanal" });

    const reopened = await owner.mutation(api.tasks.update, {
      taskId: task._id,
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    expect(reopened.isCompleted).toBe(false);
    expect(reopened.status).toBe("pendiente");
    expect(reopened.recurrence).toBe("semanal");
    expect(reopened.dueDate).toBeGreaterThan(Date.now());
    expect(reopened.subtasks![0]).toMatchObject({ id: subId, isCompleted: false });
  });

  test("setting the status to completada also reopens it and overrides the sent date", async () => {
    const { owner, task } = await setup();
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "diaria" });

    const reopened = await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      status: "completada",
      tzOffsetMinutes: TZ,
    });

    expect(reopened.status).toBe("pendiente");
    expect(reopened.isCompleted).toBe(false);
    expect(reopened.dueDate).toBeGreaterThan(Date.now());
  });

  test("checking the last subtask completes the parent, which reopens", async () => {
    const { owner, task } = await setup();
    const withSub = await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Único" });
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "diaria" });

    const result = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: withSub.subtasks![0].id,
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    expect(result.isCompleted).toBe(false);
    expect(result.subtasks![0].isCompleted).toBe(false);
    expect(result.dueDate).toBeGreaterThan(Date.now());
  });

  test("a task without recurrence still completes normally", async () => {
    const { owner, task } = await setup();
    const done = await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: true });
    expect(done.isCompleted).toBe(true);
    expect(done.status).toBe("completada");
  });

  test("recurrence can be cleared", async () => {
    const { owner, task } = await setup();
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "diaria" });
    const cleared = await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: null });
    expect(cleared.recurrence).toBeUndefined();
  });
});

describe("moving a task to another project", () => {
  test("keeps subtasks, notes, status and priority and goes to the end of the target", async () => {
    const { owner, project, task } = await setup();
    const target = await owner.mutation(api.projects.create, { name: "Destino" });
    await owner.mutation(api.tasks.create, { projectId: target._id, title: "Ya estaba" });
    await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Sub" });
    await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      notes: "Importante",
      priority: "alta",
      status: "en_progreso",
    });

    const moved = await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      projectId: target._id,
    });

    expect(moved.projectId).toBe(target._id);
    expect(moved).toMatchObject({ notes: "Importante", priority: "alta", status: "en_progreso" });
    expect(moved.subtasks).toHaveLength(1);
    expect(moved.position).toBe(1);

    const source = await owner.query(api.projects.get, { projectId: project._id });
    expect(source!.tasks).toHaveLength(0);
    const destination = await owner.query(api.projects.get, { projectId: target._id });
    expect(destination!.tasks.map((t) => t.title)).toEqual(["Ya estaba", "Tarea"]);
  });

  test("closes the position gap left in the source project", async () => {
    const { owner, project, task } = await setup();
    const second = await owner.mutation(api.tasks.create, { projectId: project._id, title: "Segunda" });
    const target = await owner.mutation(api.projects.create, { name: "Destino" });

    await owner.mutation(api.tasks.updateTask, { taskId: task._id, projectId: target._id });

    const source = await owner.query(api.projects.get, { projectId: project._id });
    expect(source!.tasks.map((t) => [t._id, t.position])).toEqual([[second._id, 0]]);
  });

  test("refuses a project that belongs to someone else", async () => {
    const { owner, intruder, task } = await setup();
    const foreign = await intruder.mutation(api.projects.create, { name: "Ajeno" });
    await expect(
      owner.mutation(api.tasks.updateTask, { taskId: task._id, projectId: foreign._id })
    ).rejects.toThrow();
  });
});

describe("tasks.createMany", () => {
  test("creates one task per non-blank line in order", async () => {
    const { owner, project } = await setup();
    const created = await owner.mutation(api.tasks.createMany, {
      projectId: project._id,
      titles: ["Uno", "  ", "Dos  ", "Tres"],
    });
    expect(created.map((t) => t.title)).toEqual(["Uno", "Dos", "Tres"]);
    expect(created.map((t) => t.position)).toEqual([1, 2, 3]);
  });

  test("rejects empty input, too many titles and foreign projects", async () => {
    const { owner, intruder, project } = await setup();
    await expect(
      owner.mutation(api.tasks.createMany, { projectId: project._id, titles: [" ", ""] })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.tasks.createMany, {
        projectId: project._id,
        titles: Array.from({ length: 51 }, (_, i) => `T${i}`),
      })
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.tasks.createMany, { projectId: project._id, titles: ["X"] })
    ).rejects.toThrow();
  });
});
