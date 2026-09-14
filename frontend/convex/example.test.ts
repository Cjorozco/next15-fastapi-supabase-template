/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function authed() {
  const ct = convexTest(schema, modules);
  return ct.withIdentity({ subject: "test-user-id" });
}

test("create and list projects", async () => {
  const t = authed();

  await t.mutation(api.users.index.store, {});
  const projects = await t.query(api.projects.queries.list, {});
  expect(projects).toHaveLength(0);

  const project = await t.mutation(api.projects.mutations.create, {
    name: "Mi proyecto",
    description: "Descripcion",
  });
  expect(project.name).toBe("Mi proyecto");
  expect(project.tasks).toHaveLength(0);

  const projects2 = await t.query(api.projects.queries.list, {});
  expect(projects2).toHaveLength(1);
});

test("tasks lifecycle", async () => {
  const t = authed();

  await t.mutation(api.users.index.store, {});
  const project = await t.mutation(api.projects.mutations.create, {
    name: "Test",
  });

  const task1 = await t.mutation(api.tasks.mutations.create, {
    projectId: project._id,
    title: "Tarea 1",
  });
  expect(task1.title).toBe("Tarea 1");
  expect(task1.position).toBe(0);

  const task2 = await t.mutation(api.tasks.mutations.create, {
    projectId: project._id,
    title: "Tarea 2",
  });
  expect(task2.position).toBe(1);

  const updated = await t.mutation(api.tasks.mutations.update, {
    taskId: task1._id,
    isCompleted: true,
  });
  expect(updated.isCompleted).toBe(true);

  await t.mutation(api.tasks.mutations.remove, { taskId: task2._id });

  const projectDetail = await t.query(api.projects.queries.get, {
    projectId: project._id,
  });
  expect(projectDetail?.tasks).toHaveLength(1);
});

test("reorder tasks", async () => {
  const t = authed();

  await t.mutation(api.users.index.store, {});
  const project = await t.mutation(api.projects.mutations.create, {
    name: "Ordenar",
  });

  const t1 = await t.mutation(api.tasks.mutations.create, {
    projectId: project._id,
    title: "A",
  });
  const t2 = await t.mutation(api.tasks.mutations.create, {
    projectId: project._id,
    title: "B",
  });
  const t3 = await t.mutation(api.tasks.mutations.create, {
    projectId: project._id,
    title: "C",
  });

  await t.mutation(api.tasks.mutations.reorder, {
    projectId: project._id,
    taskIds: [t3._id, t1._id, t2._id],
  });

  const p = await t.query(api.projects.queries.get, { projectId: project._id });
  expect(p?.tasks.map((task) => task.title)).toEqual(["C", "A", "B"]);
});

test("duplicate project name is rejected", async () => {
  const t = authed();

  await t.mutation(api.users.index.store, {});
  await t.mutation(api.projects.mutations.create, { name: "Unico" });
  await expect(
    t.mutation(api.projects.mutations.create, { name: "Unico" })
  ).rejects.toThrow("Ya tienes un proyecto con el nombre 'Unico'");
});

test("cannot access other user project", async () => {
  const a = convexTest(schema, modules).withIdentity({ subject: "user-a" });
  const b = convexTest(schema, modules).withIdentity({ subject: "user-b" });

  await a.mutation(api.users.index.store, {});
  const project = await a.mutation(api.projects.mutations.create, {
    name: "Privado",
  });

  await b.mutation(api.users.index.store, {});
  const result = await b.query(api.projects.queries.get, {
    projectId: project._id,
  });
  expect(result).toBeNull();
});
