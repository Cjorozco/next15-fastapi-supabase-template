import { query } from "../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser, requireProjectOwner } from "../lib/authorization";

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
    try {
      const project = await requireProjectOwner(ctx, args.projectId);
      return {
        ...project,
        tasks: await getTasksForProject(ctx, project._id),
      };
    } catch {
      return null;
    }
  },
});
