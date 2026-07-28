import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, getProjectForUser } from "./lib/auth";

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
    const user = await getCurrentUser(ctx);

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
    try {
      const project = await getProjectForUser(ctx, args.projectId);
      return {
        ...project,
        tasks: await getTasksForProject(ctx, project._id),
      };
    } catch {
      return null;
    }
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: projectWithTasksValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new Error("Project name is required");
    }

    const duplicate = await ctx.db
      .query("projects")
      .withIndex("by_owner_and_name", (q) =>
        q.eq("ownerId", user._id).eq("name", name)
      )
      .unique();

    if (duplicate) {
      throw new Error(`Ya tienes un proyecto con el nombre '${name}'`);
    }

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name,
      description: args.description?.trim() || undefined,
    });

    const project = await ctx.db.get("projects", projectId);
    if (!project) {
      throw new Error("Failed to create project");
    }

    return { ...project, tasks: [] };
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getProjectForUser(ctx, args.projectId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete("tasks", task._id);
    }

    await ctx.db.delete("projects", args.projectId);
    return null;
  },
});
