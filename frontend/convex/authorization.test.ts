/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/**
 * One shared database with three callers: anonymous, owner (A) and an
 * unrelated authenticated user (B). Using a single convexTest instance is
 * what makes cross-tenant checks meaningful: separate instances have
 * separate databases, so an ID from one never resolves in the other.
 */
async function setup() {
  const t = convexTest(schema, modules);
  const a = t.withIdentity({ subject: "user-a" });
  const b = t.withIdentity({ subject: "user-b" });

  await a.mutation(api.users.store, {});
  await b.mutation(api.users.store, {});

  const project = await a.mutation(api.projects.create, { name: "Privado A" });
  const task = await a.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea A",
  });
  const otherTask = await a.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Otra tarea A",
  });
  const withSubtask = await a.mutation(api.tasks.addSubtask, {
    taskId: task._id,
    title: "Subtarea A",
  });
  const subtaskId = withSubtask.subtasks![0].id;

  return { t, a, b, project, task, otherTask, subtaskId };
}

describe("unauthenticated callers", () => {
  test("every protected function rejects with NOT_AUTHENTICATED", async () => {
    const { t, project, task, otherTask, subtaskId } = await setup();

    const calls: Array<[string, () => Promise<unknown>]> = [
      ["projects.list", () => t.query(api.projects.list, {})],
      ["projects.get", () => t.query(api.projects.get, { projectId: project._id })],
      ["projects.create", () => t.mutation(api.projects.create, { name: "X" })],
      [
        "projects.createWithTasks",
        () => t.mutation(api.projects.createWithTasks, { name: "X", tasks: [] }),
      ],
      ["projects.remove", () => t.mutation(api.projects.remove, { projectId: project._id })],
      [
        "projects.applyAiRefinement",
        () =>
          t.mutation(api.projects.applyAiRefinement, {
            projectId: project._id,
            updatedDescription: "hack",
          }),
      ],
      ["projects.cleanupAll", () => t.mutation(api.projects.cleanupAll, {})],
      [
        "tasks.create",
        () => t.mutation(api.tasks.create, { projectId: project._id, title: "X" }),
      ],
      [
        "tasks.update",
        () => t.mutation(api.tasks.update, { taskId: task._id, isCompleted: true }),
      ],
      [
        "tasks.addSubtask",
        () => t.mutation(api.tasks.addSubtask, { taskId: task._id, title: "X" }),
      ],
      [
        "tasks.toggleSubtask",
        () =>
          t.mutation(api.tasks.toggleSubtask, {
            taskId: task._id,
            subtaskId,
            isCompleted: true,
          }),
      ],
      [
        "tasks.removeSubtask",
        () => t.mutation(api.tasks.removeSubtask, { taskId: task._id, subtaskId }),
      ],
      [
        "tasks.convertTaskToSubtask",
        () =>
          t.mutation(api.tasks.convertTaskToSubtask, {
            sourceTaskId: otherTask._id,
            targetTaskId: task._id,
          }),
      ],
      ["tasks.remove", () => t.mutation(api.tasks.remove, { taskId: task._id })],
      [
        "tasks.reorder",
        () =>
          t.mutation(api.tasks.reorder, {
            projectId: project._id,
            taskIds: [otherTask._id, task._id],
          }),
      ],
    ];

    for (const [name, call] of calls) {
      await expect(call(), name).rejects.toThrow("NOT_AUTHENTICATED");
    }

    // Nothing was modified by the rejected calls.
    const stored = await t.run(async (ctx) => ({
      project: await ctx.db.get(project._id),
      tasks: await ctx.db.query("tasks").collect(),
    }));
    expect(stored.project?.name).toBe("Privado A");
    expect(stored.tasks).toHaveLength(2);
  });

  test("users.store rejects and users.me returns null", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.store, {})).rejects.toThrow(
      "NOT_AUTHENTICATED"
    );
    expect(await t.query(api.users.me, {})).toBeNull();
  });

  test("an identity without a stored user record is rejected", async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: "ghost" });
    await expect(t.query(api.projects.list, {})).rejects.toThrow(
      "User record not found"
    );
    await expect(
      t.mutation(api.projects.create, { name: "X" })
    ).rejects.toThrow("User record not found");
  });
});

describe("cross-tenant isolation (user B against user A's data)", () => {
  test("B cannot read A's project and sees none in list", async () => {
    const { b, project } = await setup();
    expect(await b.query(api.projects.get, { projectId: project._id })).toBeNull();
    expect(await b.query(api.projects.list, {})).toEqual([]);
  });

  test("owner still reads their own project", async () => {
    const { a, project } = await setup();
    const result = await a.query(api.projects.get, { projectId: project._id });
    expect(result?.name).toBe("Privado A");
    expect(result?.tasks).toHaveLength(2);
  });

  test("B cannot remove A's project", async () => {
    const { t, b, project } = await setup();
    await expect(
      b.mutation(api.projects.remove, { projectId: project._id })
    ).rejects.toThrow("Project not found");

    const stored = await t.run(async (ctx) => ({
      project: await ctx.db.get(project._id),
      tasks: await ctx.db.query("tasks").collect(),
    }));
    expect(stored.project).not.toBeNull();
    expect(stored.tasks).toHaveLength(2);
  });

  test("B cannot apply an AI refinement to A's project", async () => {
    const { t, b, project } = await setup();
    await expect(
      b.mutation(api.projects.applyAiRefinement, {
        projectId: project._id,
        updatedDescription: "pwned",
        newTasks: [{ title: "Intrusa" }],
      })
    ).rejects.toThrow("Project not found");

    const stored = await t.run(async (ctx) => ({
      project: await ctx.db.get(project._id),
      tasks: await ctx.db.query("tasks").collect(),
    }));
    expect(stored.project?.description).toBeUndefined();
    expect(stored.tasks.map((x) => x.title).sort()).toEqual([
      "Otra tarea A",
      "Tarea A",
    ]);
  });

  test("B cannot use their own project to inject subtasks into A's task", async () => {
    const { t, b, task } = await setup();
    const own = await b.mutation(api.projects.create, { name: "Propio B" });

    const result = await b.mutation(api.projects.applyAiRefinement, {
      projectId: own._id,
      newSubtasksForExistingTasks: [
        { taskId: task._id, subtaskTitles: ["Intrusa"] },
      ],
    });

    expect(result.tasks).toHaveLength(0);
    const stored = await t.run(async (ctx) => ctx.db.get(task._id));
    expect(stored?.subtasks?.map((s) => s.title)).toEqual(["Subtarea A"]);
  });

  test("B cannot create tasks in A's project", async () => {
    const { t, b, project } = await setup();
    await expect(
      b.mutation(api.tasks.create, { projectId: project._id, title: "Intrusa" })
    ).rejects.toThrow("Project not found");

    const tasks = await t.run(async (ctx) => ctx.db.query("tasks").collect());
    expect(tasks).toHaveLength(2);
  });

  test("B cannot update, remove or edit subtasks of A's task", async () => {
    const { t, b, task, subtaskId } = await setup();

    await expect(
      b.mutation(api.tasks.update, { taskId: task._id, isCompleted: true })
    ).rejects.toThrow("Project not found");
    await expect(
      b.mutation(api.tasks.addSubtask, { taskId: task._id, title: "Intrusa" })
    ).rejects.toThrow("Project not found");
    await expect(
      b.mutation(api.tasks.toggleSubtask, {
        taskId: task._id,
        subtaskId,
        isCompleted: true,
      })
    ).rejects.toThrow("Project not found");
    await expect(
      b.mutation(api.tasks.removeSubtask, { taskId: task._id, subtaskId })
    ).rejects.toThrow("Project not found");
    await expect(
      b.mutation(api.tasks.remove, { taskId: task._id })
    ).rejects.toThrow("Project not found");

    const stored = await t.run(async (ctx) => ctx.db.get(task._id));
    expect(stored?.isCompleted).toBe(false);
    expect(stored?.subtasks).toHaveLength(1);
    expect(stored?.subtasks?.[0]).toMatchObject({
      id: subtaskId,
      title: "Subtarea A",
      isCompleted: false,
    });
  });

  test("B cannot reorder A's project", async () => {
    const { t, b, project, task, otherTask } = await setup();
    await expect(
      b.mutation(api.tasks.reorder, {
        projectId: project._id,
        taskIds: [otherTask._id, task._id],
      })
    ).rejects.toThrow("Project not found");

    const stored = await t.run(async (ctx) => ({
      task: await ctx.db.get(task._id),
      otherTask: await ctx.db.get(otherTask._id),
    }));
    expect(stored.task?.position).toBe(0);
    expect(stored.otherTask?.position).toBe(1);
  });

  test("B cannot reorder A's tasks through B's own project (tasks.reorder IDOR)", async () => {
    const { t, b, task, otherTask } = await setup();
    const own = await b.mutation(api.projects.create, { name: "Propio B" });
    const ownTask = await b.mutation(api.tasks.create, {
      projectId: own._id,
      title: "Tarea B",
    });

    await expect(
      b.mutation(api.tasks.reorder, {
        projectId: own._id,
        taskIds: [task._id, otherTask._id, ownTask._id],
      })
    ).rejects.toThrow("Task not found in project");

    const stored = await t.run(async (ctx) => ({
      task: await ctx.db.get(task._id),
      otherTask: await ctx.db.get(otherTask._id),
    }));
    expect(stored.task?.position).toBe(0);
    expect(stored.otherTask?.position).toBe(1);
  });

  test("B cannot convert A's tasks into subtasks", async () => {
    const { t, b, task, otherTask } = await setup();

    // Both tasks belong to A's project: ownership check rejects.
    await expect(
      b.mutation(api.tasks.convertTaskToSubtask, {
        sourceTaskId: otherTask._id,
        targetTaskId: task._id,
      })
    ).rejects.toThrow("Project not found");

    // Mixing B's own task with A's task: projects differ, so it is rejected.
    const own = await b.mutation(api.projects.create, { name: "Propio B" });
    const ownTask = await b.mutation(api.tasks.create, {
      projectId: own._id,
      title: "Tarea B",
    });
    await expect(
      b.mutation(api.tasks.convertTaskToSubtask, {
        sourceTaskId: ownTask._id,
        targetTaskId: task._id,
      })
    ).rejects.toThrow("Tasks must belong to the same project");
    await expect(
      b.mutation(api.tasks.convertTaskToSubtask, {
        sourceTaskId: otherTask._id,
        targetTaskId: ownTask._id,
      })
    ).rejects.toThrow("Tasks must belong to the same project");

    const stored = await t.run(async (ctx) => ({
      task: await ctx.db.get(task._id),
      otherTask: await ctx.db.get(otherTask._id),
      ownTask: await ctx.db.get(ownTask._id),
    }));
    expect(stored.task?.subtasks).toHaveLength(1);
    expect(stored.otherTask).not.toBeNull();
    expect(stored.ownTask).not.toBeNull();
  });

  test("B's cleanupAll only deletes B's data", async () => {
    const { t, b, project } = await setup();
    await b.mutation(api.projects.create, { name: "Propio B" });

    await b.mutation(api.projects.cleanupAll, {});

    expect(await b.query(api.projects.list, {})).toEqual([]);
    const stored = await t.run(async (ctx) => ({
      project: await ctx.db.get(project._id),
      tasks: await ctx.db.query("tasks").collect(),
    }));
    expect(stored.project).not.toBeNull();
    expect(stored.tasks).toHaveLength(2);
  });

  test("project names are unique per owner, not globally", async () => {
    const { b } = await setup();
    const created = await b.mutation(api.projects.create, { name: "Privado A" });
    expect(created.name).toBe("Privado A");
  });
});
