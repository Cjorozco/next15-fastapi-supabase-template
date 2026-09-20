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

  await t.mutation(api.users.store, {});
  const projects = await t.query(api.projects.list, {});
  expect(projects).toHaveLength(0);

  const project = await t.mutation(api.projects.create, {
    name: "Mi proyecto",
    description: "Descripcion",
  });
  expect(project.name).toBe("Mi proyecto");
  expect(project.tasks).toHaveLength(0);

  const projects2 = await t.query(api.projects.list, {});
  expect(projects2).toHaveLength(1);
});

test("tasks lifecycle", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project = await t.mutation(api.projects.create, {
    name: "Test",
  });

  const task1 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea 1",
  });
  expect(task1.title).toBe("Tarea 1");
  expect(task1.position).toBe(0);

  const task2 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea 2",
  });
  expect(task2.position).toBe(1);

  const updated = await t.mutation(api.tasks.update, {
    taskId: task1._id,
    isCompleted: true,
  });
  expect(updated.isCompleted).toBe(true);

  await t.mutation(api.tasks.remove, { taskId: task2._id });

  const projectDetail = await t.query(api.projects.get, {
    projectId: project._id,
  });
  expect(projectDetail?.tasks).toHaveLength(1);
});

test("reorder tasks", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project = await t.mutation(api.projects.create, {
    name: "Ordenar",
  });

  const t1 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "A",
  });
  const t2 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "B",
  });
  const t3 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "C",
  });

  await t.mutation(api.tasks.reorder, {
    projectId: project._id,
    taskIds: [t3._id, t1._id, t2._id],
  });

  const p = await t.query(api.projects.get, { projectId: project._id });
  expect(p?.tasks.map((task) => task.title)).toEqual(["C", "A", "B"]);
});

test("duplicate project name is rejected", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  await t.mutation(api.projects.create, { name: "Unico" });
  await expect(
    t.mutation(api.projects.create, { name: "Unico" })
  ).rejects.toThrow("Ya tienes un proyecto con el nombre 'Unico'");
});

test("cannot access other user project", async () => {
  const a = convexTest(schema, modules).withIdentity({ subject: "user-a" });
  const b = convexTest(schema, modules).withIdentity({ subject: "user-b" });

  await a.mutation(api.users.store, {});
  const project = await a.mutation(api.projects.create, {
    name: "Privado",
  });

  await b.mutation(api.users.store, {});
  const result = await b.query(api.projects.get, {
    projectId: project._id,
  });
  expect(result).toBeNull();
});

test("create project with tasks atomically", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project = await t.mutation(api.projects.createWithTasks, {
    name: "Campaña de marketing en 3 semanas",
    description: "Proyecto generado por IA para planificar lanzamiento",
    tasks: [
      { title: "Definir público objetivo", position: 0 },
      { title: "Crear contenido para redes", position: 1 },
      { title: "Lanzar anuncios de pago", position: 2 },
    ],
  });

  expect(project.name).toBe("Campaña de marketing en 3 semanas");
  expect(project.tasks).toHaveLength(3);
  expect(project.tasks[0].title).toBe("Definir público objetivo");
  expect(project.tasks[0].position).toBe(0);
  expect(project.tasks[1].title).toBe("Crear contenido para redes");
  expect(project.tasks[2].title).toBe("Lanzar anuncios de pago");

  // Verify list retrieves it with all tasks
  const allProjects = await t.query(api.projects.list, {});
  expect(allProjects).toHaveLength(1);
  expect(allProjects[0].tasks).toHaveLength(3);
});

test("subtasks lifecycle and auto-complete parent task", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project = await t.mutation(api.projects.create, {
    name: "Subtask Test Project",
  });

  const task = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea Principal",
  });

  expect(task.isCompleted).toBe(false);
  expect(task.subtasks).toEqual([]);

  // 1. Añadir 2 subtareas
  const withSubtask1 = await t.mutation(api.tasks.addSubtask, {
    taskId: task._id,
    title: "Subtarea 1",
  });
  expect(withSubtask1.subtasks).toHaveLength(1);
  expect(withSubtask1.subtasks?.[0].title).toBe("Subtarea 1");
  expect(withSubtask1.subtasks?.[0].isCompleted).toBe(false);
  expect(withSubtask1.isCompleted).toBe(false);

  const sub1Id = withSubtask1.subtasks![0].id;

  const withSubtask2 = await t.mutation(api.tasks.addSubtask, {
    taskId: task._id,
    title: "Subtarea 2",
  });
  expect(withSubtask2.subtasks).toHaveLength(2);
  const sub2Id = withSubtask2.subtasks![1].id;

  // 2. Completar solo la primera subtarea -> Tarea padre sigue incompleta
  const partialComplete = await t.mutation(api.tasks.toggleSubtask, {
    taskId: task._id,
    subtaskId: sub1Id,
    isCompleted: true,
  });
  expect(partialComplete.subtasks?.[0].isCompleted).toBe(true);
  expect(partialComplete.subtasks?.[1].isCompleted).toBe(false);
  expect(partialComplete.isCompleted).toBe(false);

  // 3. Completar la segunda subtarea -> TAREA PADRE SE AUTO-COMPLETA (Regla de negocio)
  const allComplete = await t.mutation(api.tasks.toggleSubtask, {
    taskId: task._id,
    subtaskId: sub2Id,
    isCompleted: true,
  });
  expect(allComplete.subtasks?.[0].isCompleted).toBe(true);
  expect(allComplete.subtasks?.[1].isCompleted).toBe(true);
  expect(allComplete.isCompleted).toBe(true);

  // 4. Desmarcar una subtarea -> Tarea padre se desmarca automáticamente
  const uncompleteOne = await t.mutation(api.tasks.toggleSubtask, {
    taskId: task._id,
    subtaskId: sub1Id,
    isCompleted: false,
  });
  expect(uncompleteOne.isCompleted).toBe(false);

  // 5. Eliminar la subtarea incompleta -> Queda solo 1 subtarea (que está completada) -> Tarea padre pasa a completada
  const afterRemove = await t.mutation(api.tasks.removeSubtask, {
    taskId: task._id,
    subtaskId: sub1Id,
  });
  expect(afterRemove.subtasks).toHaveLength(1);
  expect(afterRemove.isCompleted).toBe(true);
});

test("convert existing task into a subtask of another task", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project = await t.mutation(api.projects.create, {
    name: "Convert Task Project",
  });

  const task1 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea Padre",
  });

  const task2 = await t.mutation(api.tasks.create, {
    projectId: project._id,
    title: "Tarea a Convertir",
  });

  // Verify initial state
  const initialProject = await t.query(api.projects.get, { projectId: project._id });
  expect(initialProject?.tasks).toHaveLength(2);

  // Convert task2 into a subtask of task1
  const updatedTarget = await t.mutation(api.tasks.convertTaskToSubtask, {
    sourceTaskId: task2._id,
    targetTaskId: task1._id,
  });

  expect(updatedTarget._id).toBe(task1._id);
  expect(updatedTarget.subtasks).toHaveLength(1);
  expect(updatedTarget.subtasks?.[0].title).toBe("Tarea a Convertir");

  // Verify task2 is no longer in top-level tasks
  const afterConvertProject = await t.query(api.projects.get, { projectId: project._id });
  expect(afterConvertProject?.tasks).toHaveLength(1);
  expect(afterConvertProject?.tasks[0].title).toBe("Tarea Padre");
  expect(afterConvertProject?.tasks[0].subtasks).toHaveLength(1);
});

test("cannot reorder tasks belonging to another project", async () => {
  const t = authed();

  await t.mutation(api.users.store, {});
  const project1 = await t.mutation(api.projects.create, { name: "Proyecto 1" });
  const project2 = await t.mutation(api.projects.create, { name: "Proyecto 2" });

  const t1 = await t.mutation(api.tasks.create, {
    projectId: project1._id,
    title: "P1 Tarea",
  });
  const t2 = await t.mutation(api.tasks.create, {
    projectId: project2._id,
    title: "P2 Tarea",
  });

  await expect(
    t.mutation(api.tasks.reorder, {
      projectId: project1._id,
      taskIds: [t2._id, t1._id],
    })
  ).rejects.toThrow("Task not found in project");
});
