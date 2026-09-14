import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProjectOwner } from "./lib/authorization";
import { DomainException } from "./lib/errors";

const taskValidator = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  title: v.string(),
  isCompleted: v.boolean(),
  position: v.number(),
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

    await ctx.db.patch(args.taskId, {
      isCompleted: args.isCompleted,
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
