import { v } from "convex/values";
import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { projectPriorityValidator, projectStatusValidator } from "./projectDto";
import { taskValidator, toTaskDto } from "./taskDto";

/** A project with its tasks, as the app (`api.projects.*`) and the MCP server return it. */
export const projectWithTasksValidator = v.object({
  _id: v.id("projects"),
  _creationTime: v.number(),
  ownerId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  priority: v.optional(projectPriorityValidator),
  status: v.optional(projectStatusValidator),
  dueDate: v.optional(v.number()),
  tasks: v.array(taskValidator),
});

/** Tasks of a project in board order, normalized for clients. */
export async function getTasksForProject(ctx: QueryCtx, projectId: Id<"projects">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();

  return tasks.sort((a, b) => a.position - b.position).map(toTaskDto);
}

/** Every project of `ownerId` with its tasks, newest project first. */
export async function listProjectsWithTasks(ctx: QueryCtx, ownerId: Id<"users">) {
  const projects = await ctx.db
    .query("projects")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .order("desc")
    .collect();

  return await Promise.all(
    projects.map(async (project) => ({
      ...project,
      tasks: await getTasksForProject(ctx, project._id),
    }))
  );
}
