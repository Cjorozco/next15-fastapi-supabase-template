import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, requireProjectOwner } from "../lib/authorization";
import { DomainException } from "../lib/errors";

const taskValidator = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  title: v.string(),
  isCompleted: v.boolean(),
  position: v.number(),
});

const projectWithTasksValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  tasks: v.array(taskValidator),
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
