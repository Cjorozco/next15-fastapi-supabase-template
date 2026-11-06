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

  test("checking the last subtask of a recurring task finishes it for good", async () => {
    const { owner, task } = await setup();
    const withSub = await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Único" });
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "diaria" });

    const result = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: withSub.subtasks![0].id,
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.status).toBe("completada");
    expect(result.subtasks![0].isCompleted).toBe(true);
  });

  describe("Monday to Friday", () => {
    // Fri 14, Sat 15, Sun 16 and Mon 17 of June 2030, at noon in Bogotá.
    const BOGOTA = 300;
    const FRIDAY = Date.UTC(2030, 5, 14, 17);
    const SATURDAY = Date.UTC(2030, 5, 15, 17);
    const SUNDAY = Date.UTC(2030, 5, 16, 17);
    const MONDAY = Date.UTC(2030, 5, 17, 17);

    test("switching a task dated on Saturday moves it to Monday", async () => {
      const { owner, task } = await setup();
      await owner.mutation(api.tasks.updateTask, {
        taskId: task._id,
        recurrence: "diaria",
        dueDate: SATURDAY,
      });

      const updated = await owner.mutation(api.tasks.updateTask, {
        taskId: task._id,
        recurrence: "laboral",
        tzOffsetMinutes: BOGOTA,
      });

      expect(updated.recurrence).toBe("laboral");
      expect(updated.dueDate).toBe(MONDAY);
    });

    test("a Sunday date set on an existing task moves to Monday", async () => {
      const { owner, task } = await setup();
      await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "laboral" });

      const updated = await owner.mutation(api.tasks.updateTask, {
        taskId: task._id,
        dueDate: SUNDAY,
        tzOffsetMinutes: BOGOTA,
      });

      expect(updated.dueDate).toBe(MONDAY);
    });

    test("a weekday date stays as it is", async () => {
      const { owner, task } = await setup();
      const updated = await owner.mutation(api.tasks.updateTask, {
        taskId: task._id,
        recurrence: "laboral",
        dueDate: FRIDAY,
        tzOffsetMinutes: BOGOTA,
      });
      expect(updated.dueDate).toBe(FRIDAY);
    });

    test("a daily task can keep a weekend date", async () => {
      const { owner, task } = await setup();
      const updated = await owner.mutation(api.tasks.updateTask, {
        taskId: task._id,
        recurrence: "diaria",
        dueDate: SATURDAY,
        tzOffsetMinutes: BOGOTA,
      });
      expect(updated.dueDate).toBe(SATURDAY);
    });

    test("completing it reopens the task on a weekday", async () => {
      const { owner, task } = await setup();
      await owner.mutation(api.tasks.updateTask, { taskId: task._id, recurrence: "laboral" });

      const reopened = await owner.mutation(api.tasks.update, {
        taskId: task._id,
        isCompleted: true,
        tzOffsetMinutes: TZ,
      });

      expect(reopened.isCompleted).toBe(false);
      expect(reopened.dueDate).toBeGreaterThan(Date.now());
      expect([0, 6]).not.toContain(new Date(reopened.dueDate!).getUTCDay());
    });
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

describe("tasks without deadline", () => {
  test("existing tasks load without the flag", async () => {
    const { task } = await setup();
    expect(task.noDeadline).toBeUndefined();
  });

  test("noDeadline clears the date and setting a date turns it off", async () => {
    const { owner, task } = await setup();
    const due = new Date(2030, 0, 15).getTime();
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, dueDate: due });

    const open = await owner.mutation(api.tasks.updateTask, { taskId: task._id, noDeadline: true });
    expect(open.noDeadline).toBe(true);
    expect(open.dueDate).toBeUndefined();

    const dated = await owner.mutation(api.tasks.updateTask, { taskId: task._id, dueDate: due });
    expect(dated.noDeadline).toBe(false);
    expect(dated.dueDate).toBe(due);
  });

  test("rejects a date together with noDeadline", async () => {
    const { owner, task } = await setup();
    await expect(
      owner.mutation(api.tasks.updateTask, { taskId: task._id, noDeadline: true, dueDate: 123456 })
    ).rejects.toThrow();
  });

  test("AI-created tasks keep the flag and reject date plus flag", async () => {
    const { owner } = await setup();
    const created = await owner.mutation(api.projects.createWithTasks, {
      name: "Hábitos",
      tasks: [
        { title: "Leer", position: 0, noDeadline: true },
        { title: "Entregar", position: 1, dueDate: new Date(2030, 0, 15).getTime() },
      ],
    });
    expect(created.tasks[0].noDeadline).toBe(true);
    expect(created.tasks[1].noDeadline).toBeUndefined();

    await expect(
      owner.mutation(api.projects.createWithTasks, {
        name: "Mal",
        tasks: [{ title: "X", position: 0, noDeadline: true, dueDate: 123456 }],
      })
    ).rejects.toThrow();
  });

  test("applyAiRefinement stores the flag on new tasks", async () => {
    const { owner, project } = await setup();
    const refined = await owner.mutation(api.projects.applyAiRefinement, {
      projectId: project._id,
      newTasks: [{ title: "Meditar", noDeadline: true }],
    });
    expect(refined.tasks.find((t) => t.title === "Meditar")?.noDeadline).toBe(true);
  });
});

describe("noDeadline persistence (read back through the project query)", () => {
  test("the value saved by the edit form is what projects.get and projects.list return", async () => {
    const { owner, project, task } = await setup();

    // Exactly what TaskEditForm sends when "Sin fecha límite" is checked on an undated task.
    await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      title: "Tarea",
      status: "pendiente",
      dueDate: null,
      noDeadline: true,
      estimatedHours: null,
      priority: null,
      recurrence: null,
      notes: null,
      tzOffsetMinutes: 300,
    });

    const viaGet = await owner.query(api.projects.get, { projectId: project._id });
    expect(viaGet!.tasks[0].noDeadline).toBe(true);
    expect(viaGet!.tasks[0].dueDate).toBeUndefined();

    const viaList = await owner.query(api.projects.list, {});
    expect(viaList.find((p) => p._id === project._id)!.tasks[0].noDeadline).toBe(true);
  });

  test("a later save that unchecks the flag persists false", async () => {
    const { owner, project, task } = await setup();
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, noDeadline: true, dueDate: null });
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, noDeadline: false, dueDate: null });
    const loaded = await owner.query(api.projects.get, { projectId: project._id });
    expect(loaded!.tasks[0].noDeadline).toBe(false);
  });
});

describe("AI-created habits keep recurrence and short durations", () => {
  test("createWithTasks stores recurrence + noDeadline + 10 min and the query returns them", async () => {
    const { owner } = await setup();
    const created = await owner.mutation(api.projects.createWithTasks, {
      name: "Inglés",
      tasks: [
        { title: "10 min de práctica", position: 0, estimatedHours: 0.17, noDeadline: true, recurrence: "diaria" },
      ],
    });
    const loaded = await owner.query(api.projects.get, { projectId: created._id });
    expect(loaded!.tasks[0]).toMatchObject({ noDeadline: true, recurrence: "diaria", estimatedHours: 0.17 });
  });

  test("applyAiRefinement stores recurrence on new tasks", async () => {
    const { owner, project } = await setup();
    await owner.mutation(api.projects.applyAiRefinement, {
      projectId: project._id,
      newTasks: [{ title: "Repaso semanal", noDeadline: true, recurrence: "semanal" }],
    });
    const loaded = await owner.query(api.projects.get, { projectId: project._id });
    expect(loaded!.tasks.find((t) => t.title === "Repaso semanal")).toMatchObject({
      noDeadline: true,
      recurrence: "semanal",
    });
  });
});

describe("AI habit created as one task with subtasks and notes", () => {
  test("createWithTasks stores subtasks (unchecked, with ids) and notes", async () => {
    const { owner } = await setup();
    const created = await owner.mutation(api.projects.createWithTasks, {
      name: "Inglés diario",
      tasks: [
        {
          title: "Practicar inglés",
          position: 0,
          estimatedHours: 0.1667,
          noDeadline: true,
          recurrence: "diaria",
          subtasks: ["Vocabulario", "  ", "Pronunciación"],
          notes: "  Rota el foco  ",
        },
      ],
    });
    const loaded = await owner.query(api.projects.get, { projectId: created._id });
    const [task] = loaded!.tasks;
    expect(loaded!.tasks).toHaveLength(1);
    expect(task.notes).toBe("Rota el foco");
    expect(task.estimatedHours).toBe(0.1667);
    expect(task.subtasks!.map((s) => [s.title, s.isCompleted])).toEqual([
      ["Vocabulario", false],
      ["Pronunciación", false],
    ]);
    expect(new Set(task.subtasks!.map((s) => s.id)).size).toBe(2);
  });

  test("rejects too many subtasks and over-long notes", async () => {
    const { owner } = await setup();
    await expect(
      owner.mutation(api.projects.createWithTasks, {
        name: "Muchas",
        tasks: [{ title: "T", position: 0, subtasks: Array.from({ length: 21 }, (_, i) => `S${i}`) }],
      })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.projects.createWithTasks, {
        name: "Notas",
        tasks: [{ title: "T", position: 0, notes: "x".repeat(5001) }],
      })
    ).rejects.toThrow();
  });
});

describe("a completed project goes back to active when it gets open work again", () => {
  async function completedProject() {
    const ctx = await setup();
    await ctx.owner.mutation(api.tasks.update, { taskId: ctx.task._id, isCompleted: true });
    await ctx.owner.mutation(api.projects.updateProject, {
      projectId: ctx.project._id,
      status: "completado",
    });
    const status = async () =>
      (await ctx.owner.query(api.projects.get, { projectId: ctx.project._id }))!.status;
    return { ...ctx, status };
  }

  test("un-checking a task", async () => {
    const { owner, task, status } = await completedProject();
    expect(await status()).toBe("completado");
    await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: false });
    expect(await status()).toBe("activo");
  });

  test("changing a completed task to another status", async () => {
    const { owner, task, status } = await completedProject();
    await owner.mutation(api.tasks.updateTask, { taskId: task._id, status: "en_progreso" });
    expect(await status()).toBe("activo");
  });

  test("adding a task or several", async () => {
    const one = await completedProject();
    await one.owner.mutation(api.tasks.create, { projectId: one.project._id, title: "Nueva" });
    expect(await one.status()).toBe("activo");

    const many = await completedProject();
    await many.owner.mutation(api.tasks.createMany, { projectId: many.project._id, titles: ["A", "B"] });
    expect(await many.status()).toBe("activo");
  });

  test("adding a subtask", async () => {
    const { owner, task, status } = await completedProject();
    await owner.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Paso" });
    expect(await status()).toBe("activo");
  });

  test("un-checking a subtask of a completed task", async () => {
    const ctx = await setup();
    await ctx.owner.mutation(api.tasks.addSubtask, { taskId: ctx.task._id, title: "Paso" });
    const withSub = await ctx.owner.query(api.projects.get, { projectId: ctx.project._id });
    const subtaskId = withSub!.tasks[0].subtasks![0].id;
    await ctx.owner.mutation(api.tasks.toggleSubtask, { taskId: ctx.task._id, subtaskId, isCompleted: true });
    await ctx.owner.mutation(api.projects.updateProject, { projectId: ctx.project._id, status: "completado" });
    await ctx.owner.mutation(api.tasks.toggleSubtask, { taskId: ctx.task._id, subtaskId, isCompleted: false });
    const after = await ctx.owner.query(api.projects.get, { projectId: ctx.project._id });
    expect(after!.status).toBe("activo");
  });

  test("does not touch paused projects or completing tasks", async () => {
    const { owner, project, task } = await setup();
    await owner.mutation(api.projects.updateProject, { projectId: project._id, status: "en_pausa" });
    await owner.mutation(api.tasks.create, { projectId: project._id, title: "Otra" });
    await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: true });
    const loaded = await owner.query(api.projects.get, { projectId: project._id });
    expect(loaded!.status).toBe("en_pausa");
  });
});

describe("editing and reordering subtasks", () => {
  async function withSubtasks(titles: string[]) {
    const ctx = await setup();
    for (const title of titles) {
      await ctx.owner.mutation(api.tasks.addSubtask, { taskId: ctx.task._id, title });
    }
    const read = async () => {
      const project = await ctx.owner.query(api.projects.get, { projectId: ctx.project._id });
      return project!.tasks[0].subtasks!;
    };
    return { ...ctx, read };
  }

  test("updateSubtask renames only that subtask and keeps its state", async () => {
    const { owner, task, read } = await withSubtasks(["Uno", "Dos"]);
    const [first, second] = await read();
    await owner.mutation(api.tasks.toggleSubtask, { taskId: task._id, subtaskId: first.id, isCompleted: true });

    await owner.mutation(api.tasks.updateSubtask, { taskId: task._id, subtaskId: first.id, title: "  Uno bis  " });

    expect(await read()).toEqual([
      { id: first.id, title: "Uno bis", isCompleted: true },
      second,
    ]);
  });

  test("updateSubtask rejects blank/too long titles and unknown subtasks", async () => {
    const { owner, task, read } = await withSubtasks(["Uno"]);
    const [first] = await read();
    await expect(
      owner.mutation(api.tasks.updateSubtask, { taskId: task._id, subtaskId: first.id, title: "   " })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.tasks.updateSubtask, { taskId: task._id, subtaskId: first.id, title: "x".repeat(201) })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.tasks.updateSubtask, { taskId: task._id, subtaskId: "nope", title: "Ok" })
    ).rejects.toThrow();
  });

  test("moveSubtask swaps with the neighbour and ignores the ends", async () => {
    const { owner, task, read } = await withSubtasks(["A", "B", "C"]);
    const titles = async () => (await read()).map((s) => s.title);
    const [a, , c] = await read();

    await owner.mutation(api.tasks.moveSubtask, { taskId: task._id, subtaskId: c.id, direction: "up" });
    expect(await titles()).toEqual(["A", "C", "B"]);

    await owner.mutation(api.tasks.moveSubtask, { taskId: task._id, subtaskId: a.id, direction: "down" });
    expect(await titles()).toEqual(["C", "A", "B"]);

    await owner.mutation(api.tasks.moveSubtask, { taskId: task._id, subtaskId: c.id, direction: "up" });
    expect(await titles()).toEqual(["C", "A", "B"]);
  });

  test("another user cannot edit or move subtasks", async () => {
    const { intruder, task, read } = await withSubtasks(["A", "B"]);
    const [a] = await read();
    await expect(
      intruder.mutation(api.tasks.updateSubtask, { taskId: task._id, subtaskId: a.id, title: "X" })
    ).rejects.toThrow();
    await expect(
      intruder.mutation(api.tasks.moveSubtask, { taskId: task._id, subtaskId: a.id, direction: "down" })
    ).rejects.toThrow();
  });
});

describe("recurring tasks with subtasks keep their progress", () => {
  async function recurringWithSubtasks() {
    const ctx = await setup();
    for (const title of ["Uno", "Dos", "Tres"]) {
      await ctx.owner.mutation(api.tasks.addSubtask, { taskId: ctx.task._id, title });
    }
    await ctx.owner.mutation(api.tasks.updateTask, { taskId: ctx.task._id, recurrence: "diaria" });
    const read = async () => {
      const project = await ctx.owner.query(api.projects.get, { projectId: ctx.project._id });
      return project!.tasks[0];
    };
    const ids = (await read()).subtasks!.map((s) => s.id);
    return { ...ctx, read, ids };
  }
  const TZ = 0;

  test("checking one subtask is the work of the day: task done for today, progress kept", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();

    const result = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[0],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    expect(result.isCompleted).toBe(false);
    expect(result.dueDate).toBeGreaterThan(Date.now());
    expect(result.subtasks!.map((s) => s.isCompleted)).toEqual([true, false, false]);
  });

  test("a second subtask the same day does not skip another day", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();
    const first = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[0],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });
    const second = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[1],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    expect(second.dueDate).toBe(first.dueDate);
    expect(second.subtasks!.map((s) => s.isCompleted)).toEqual([true, true, false]);
  });

  test("unchecking a subtask does not move the date", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();
    const first = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[0],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });
    const undone = await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[0],
      isCompleted: false,
      tzOffsetMinutes: TZ,
    });
    expect(undone.dueDate).toBe(first.dueDate);
    expect(undone.subtasks!.every((s) => !s.isCompleted)).toBe(true);
  });

  test("checking the task itself means 'that is all for today' and keeps the subtasks as they are", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();
    await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[0],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });

    const done = await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: true, tzOffsetMinutes: TZ });

    expect(done.isCompleted).toBe(false);
    expect(done.subtasks!.map((s) => s.isCompleted)).toEqual([true, false, false]);
  });

  test("checking the task with no subtask done is allowed and keeps them unchecked", async () => {
    const { owner, task } = await recurringWithSubtasks();
    const done = await owner.mutation(api.tasks.update, { taskId: task._id, isCompleted: true, tzOffsetMinutes: TZ });
    expect(done.dueDate).toBeGreaterThan(Date.now());
    expect(done.subtasks!.every((s) => !s.isCompleted)).toBe(true);
  });

  test("finishing the last subtask ends the task and restarting it unchecks everything", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();
    let last;
    for (const subtaskId of ids) {
      last = await owner.mutation(api.tasks.toggleSubtask, {
        taskId: task._id,
        subtaskId,
        isCompleted: true,
        tzOffsetMinutes: TZ,
      });
    }
    expect(last!.isCompleted).toBe(true);
    expect(last!.status).toBe("completada");
    expect(last!.subtasks!.every((s) => s.isCompleted)).toBe(true);
    const nextDate = last!.dueDate;
    expect(nextDate).toBeGreaterThan(Date.now());

    const restarted = await owner.mutation(api.tasks.update, {
      taskId: task._id,
      isCompleted: false,
      tzOffsetMinutes: TZ,
    });
    expect(restarted.isCompleted).toBe(false);
    expect(restarted.status).toBe("pendiente");
    expect(restarted.subtasks!.every((s) => !s.isCompleted)).toBe(true);
    expect(restarted.dueDate).toBe(nextDate);
  });

  test("completada from the edit form keeps the progress too", async () => {
    const { owner, task, ids } = await recurringWithSubtasks();
    await owner.mutation(api.tasks.toggleSubtask, {
      taskId: task._id,
      subtaskId: ids[1],
      isCompleted: true,
      tzOffsetMinutes: TZ,
    });
    const done = await owner.mutation(api.tasks.updateTask, {
      taskId: task._id,
      status: "completada",
      tzOffsetMinutes: TZ,
    });
    expect(done.isCompleted).toBe(false);
    expect(done.subtasks!.map((s) => s.isCompleted)).toEqual([false, true, false]);
  });
});
