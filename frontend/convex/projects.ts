import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requireProjectOwner } from "./lib/authorization";
import { DomainException } from "./lib/errors";

const subtaskValidator = v.object({
  id: v.string(),
  title: v.string(),
  isCompleted: v.boolean(),
});

const taskValidator = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  title: v.string(),
  isCompleted: v.boolean(),
  position: v.number(),
  subtasks: v.optional(v.array(subtaskValidator)),
});

const projectWithTasksValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  tasks: v.array(taskValidator),
});

async function getTasksForProject(
  ctx: QueryCtx,
  projectId: Id<"projects">
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  return tasks.sort((a, b) => a.position - b.position);
}

export const list = query({
  args: {},
  returns: v.array(projectWithTasksValidator),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      projects.map(async (project) => ({
        ...project,
        tasks: await getTasksForProject(ctx, project._id),
      }))
    );
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  returns: v.union(projectWithTasksValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== user._id) {
      return null;
    }

    return {
      ...project,
      tasks: await getTasksForProject(ctx, project._id),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: projectWithTasksValidator,
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new DomainException("INVALID_INPUT", "Project name is required");
    }

    const duplicate = await ctx.db
      .query("projects")
      .withIndex("by_owner_and_name", (q) =>
        q.eq("ownerId", user._id).eq("name", name)
      )
      .unique();

    if (duplicate) {
      throw new DomainException(
        "DUPLICATE_ENTITY",
        `Ya tienes un proyecto con el nombre '${name}'`
      );
    }

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name,
      description: args.description?.trim() || undefined,
    });

    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to create project");
    }

    return { ...project, tasks: [] };
  },
});

export const createWithTasks = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    tasks: v.array(
      v.object({
        title: v.string(),
        position: v.number(),
      })
    ),
  },
  returns: projectWithTasksValidator,
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new DomainException("INVALID_INPUT", "Project name is required");
    }

    const duplicate = await ctx.db
      .query("projects")
      .withIndex("by_owner_and_name", (q) =>
        q.eq("ownerId", user._id).eq("name", name)
      )
      .unique();

    if (duplicate) {
      throw new DomainException(
        "DUPLICATE_ENTITY",
        `Ya tienes un proyecto con el nombre '${name}'`
      );
    }

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name,
      description: args.description?.trim() || undefined,
    });

    const createdTasks = [];
    for (const task of args.tasks) {
      const taskTitle = task.title.trim();
      if (taskTitle) {
        const taskId = await ctx.db.insert("tasks", {
          projectId,
          title: taskTitle,
          isCompleted: false,
          position: task.position,
        });
        const createdTask = await ctx.db.get(taskId);
        if (createdTask) {
          createdTasks.push(createdTask);
        }
      }
    }

    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to create project");
    }

    return {
      ...project,
      tasks: createdTasks.sort((a, b) => a.position - b.position),
    };
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.projectId);
    return null;
  },
});

export const applyAiRefinement = mutation({
  args: {
    projectId: v.id("projects"),
    updatedDescription: v.optional(v.string()),
    newTasks: v.optional(
      v.array(
        v.object({
          title: v.string(),
          subtasks: v.optional(v.array(v.string())),
        })
      )
    ),
    newSubtasksForExistingTasks: v.optional(
      v.array(
        v.object({
          taskId: v.string(),
          subtaskTitles: v.array(v.string()),
        })
      )
    ),
  },
  returns: projectWithTasksValidator,
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    // 1. Actualizar descripción si se especificó
    if (args.updatedDescription !== undefined) {
      const cleanDesc = args.updatedDescription.trim();
      await ctx.db.patch(args.projectId, {
        description: cleanDesc ? cleanDesc : undefined,
      });
    }

    // 2. Inyectar nuevas subtareas a tareas existentes
    if (args.newSubtasksForExistingTasks && args.newSubtasksForExistingTasks.length > 0) {
      for (const item of args.newSubtasksForExistingTasks) {
        try {
          const taskId = ctx.db.normalizeId("tasks", item.taskId);
          if (taskId) {
            const task = await ctx.db.get(taskId);
            if (task && task.projectId === args.projectId) {
              const currentSubtasks = task.subtasks || [];
              const generatedNewSubtasks = item.subtaskTitles
                .map((t) => t.trim())
                .filter(Boolean)
                .map((title) => ({
                  id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  title,
                  isCompleted: false,
                }));

              if (generatedNewSubtasks.length > 0) {
                const mergedSubtasks = [...currentSubtasks, ...generatedNewSubtasks];
                await ctx.db.patch(taskId, {
                  subtasks: mergedSubtasks,
                  isCompleted: false,
                });
              }
            }
          }
        } catch {
          // Si el ID no era válido, continuar de forma segura
        }
      }
    }

    // 3. Añadir nuevas tareas al proyecto
    if (args.newTasks && args.newTasks.length > 0) {
      const currentTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();

      let nextPosition = currentTasks.reduce((max, t) => Math.max(max, t.position), -1) + 1;

      for (const newTask of args.newTasks) {
        const title = newTask.title.trim();
        if (title) {
          const subtasks = (newTask.subtasks || [])
            .map((st) => st.trim())
            .filter(Boolean)
            .map((stTitle) => ({
              id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              title: stTitle,
              isCompleted: false,
            }));

          await ctx.db.insert("tasks", {
            projectId: args.projectId,
            title,
            isCompleted: false,
            position: nextPosition++,
            subtasks,
          });
        }
      }
    }

    const updatedProject = await ctx.db.get(args.projectId);
    if (!updatedProject) {
      throw new DomainException("ENTITY_NOT_FOUND", "Project not found");
    }

    const finalTasks = await getTasksForProject(ctx, args.projectId);
    return {
      ...updatedProject,
      tasks: finalTasks,
    };
  },
});

export const cleanupAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    for (const project of projects) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }
      await ctx.db.delete(project._id);
    }
    return null;
  },
});
