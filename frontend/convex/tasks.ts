import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getProjectForUser } from "./lib/auth";

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
    await getProjectForUser(ctx, args.projectId);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Task title is required");
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

    const task = await ctx.db.get("tasks", taskId);
    if (!task) {
      throw new Error("Failed to create task");
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
    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await getProjectForUser(ctx, task.projectId);

    await ctx.db.patch("tasks", args.taskId, {
      isCompleted: args.isCompleted,
    });

    const updated = await ctx.db.get("tasks", args.taskId);
    if (!updated) {
      throw new Error("Task not found");
    }

    return updated;
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await getProjectForUser(ctx, task.projectId);
    await ctx.db.delete("tasks", args.taskId);
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
    await getProjectForUser(ctx, args.projectId);

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const tasksById = new Map(existingTasks.map((task) => [task._id, task]));

    for (const [index, taskId] of args.taskIds.entries()) {
      const task = tasksById.get(taskId);
      if (task) {
        await ctx.db.patch("tasks", taskId, { position: index });
      }
    }

    return null;
  },
});
