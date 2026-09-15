import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProjectOwner } from "./lib/authorization";
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

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    const title = args.title.trim();
    if (!title) {
      throw new DomainException("INVALID_INPUT", "Task title is required");
    }

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const nextPosition =
      existingTasks.reduce((max, task) => Math.max(max, task.position), -1) + 1;

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title,
      isCompleted: false,
      position: nextPosition,
      subtasks: [],
    });

    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to create task");
    }

    return task;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    isCompleted: v.boolean(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    // Si la tarea tiene subtareas, sincronizar el estado de todas las subtareas
    const updatedSubtasks = task.subtasks?.map((subtask) => ({
      ...subtask,
      isCompleted: args.isCompleted,
    }));

    await ctx.db.patch(args.taskId, {
      isCompleted: args.isCompleted,
      ...(updatedSubtasks ? { subtasks: updatedSubtasks } : {}),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return updated;
  },
});

export const addSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const title = args.title.trim();
    if (!title) {
      throw new DomainException("INVALID_INPUT", "Subtask title is required");
    }

    const currentSubtasks = task.subtasks || [];
    const newSubtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      isCompleted: false,
    };

    const newSubtasks = [...currentSubtasks, newSubtask];

    // Al añadir una subtarea incompleta, la tarea padre no puede estar completa
    await ctx.db.patch(args.taskId, {
      subtasks: newSubtasks,
      isCompleted: false,
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return updated;
  },
});

export const toggleSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
    isCompleted: v.boolean(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === args.subtaskId ? { ...st, isCompleted: args.isCompleted } : st
    );

    // Regla de negocio: al completarse todas las subtareas se completa la tarea
    const allCompleted =
      updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.isCompleted);

    await ctx.db.patch(args.taskId, {
      subtasks: updatedSubtasks,
      isCompleted: allCompleted,
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return updated;
  },
});

export const removeSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter((st) => st.id !== args.subtaskId);

    // Recalcular si las restantes están todas completas
    const allCompleted =
      updatedSubtasks.length > 0 ? updatedSubtasks.every((st) => st.isCompleted) : task.isCompleted;

    await ctx.db.patch(args.taskId, {
      subtasks: updatedSubtasks,
      isCompleted: allCompleted,
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return updated;
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);
    await ctx.db.delete(args.taskId);
    return null;
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id("projects"),
    taskIds: v.array(v.id("tasks")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    for (let index = 0; index < args.taskIds.length; index++) {
      const taskId = args.taskIds[index];
      await ctx.db.patch(taskId, { position: index });
    }

    return null;
  },
});
