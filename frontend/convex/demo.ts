import { internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { DEMO_PROJECTS } from "./lib/demoData";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Restaura el estado inicial del usuario demo.
 *
 * Aislamiento: el único usuario cuyos datos se tocan es el que tiene
 * `tokenIdentifier === demoTokenIdentifier`. Todo borrado se hace sobre
 * proyectos con `ownerId === demoUser._id` (índice by_owner) y las tareas de
 * esos proyectos (índice by_project). No hay recorridos globales de tablas.
 */
export async function resetDemoData(
  ctx: MutationCtx,
  demoTokenIdentifier: string,
  demoEmail: string
) {
  let demoUser = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", demoTokenIdentifier))
    .unique();

  if (!demoUser) {
    const id = await ctx.db.insert("users", {
      tokenIdentifier: demoTokenIdentifier,
      email: demoEmail,
      createdAt: Date.now(),
    });
    demoUser = (await ctx.db.get(id))!;
  }

  const existing = await ctx.db
    .query("projects")
    .withIndex("by_owner", (q) => q.eq("ownerId", demoUser._id))
    .collect();

  for (const project of existing) {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }
    await ctx.db.delete(project._id);
  }

  const now = Date.now();
  for (const project of DEMO_PROJECTS) {
    const projectId = await ctx.db.insert("projects", {
      ownerId: demoUser._id,
      name: project.name,
      description: project.description,
    });

    for (let position = 0; position < project.tasks.length; position++) {
      const task = project.tasks[position];
      await ctx.db.insert("tasks", {
        projectId,
        title: task.title,
        isCompleted: task.status === "done",
        position,
        status: task.status,
        priority: task.priority,
        dueDate: now + task.dueInDays * DAY_MS,
        assignee: task.assignee,
        subtasks: (task.subtasks ?? []).map((st, i) => ({
          id: `demo_${position}_${i}`,
          title: st.title,
          isCompleted: st.isCompleted,
        })),
      });
    }
  }

  return { projects: DEMO_PROJECTS.length };
}

/**
 * Invocada solo por el cron (convex/crons.ts). Es interna: no se puede llamar
 * desde el cliente. Si DEMO_TOKEN_IDENTIFIER no está configurado, no hace nada.
 */
export const reset = internalMutation({
  args: {},
  returns: v.union(v.null(), v.object({ projects: v.number() })),
  handler: async (ctx) => {
    const tokenIdentifier = process.env.DEMO_TOKEN_IDENTIFIER;
    if (!tokenIdentifier) {
      return null;
    }
    return await resetDemoData(
      ctx,
      tokenIdentifier,
      process.env.DEMO_EMAIL ?? "demo"
    );
  },
});
