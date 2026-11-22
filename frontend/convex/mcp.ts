import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { DomainException } from "./lib/errors";
import { listProjectsWithTasks, projectWithTasksValidator } from "./lib/projectQueries";
import { taskValidator, toTaskDto } from "./lib/taskDto";

/**
 * Read-only surface for the MCP server (`src/app/api/mcp/route.ts`).
 *
 * The MCP server has no Supabase session, so these queries do not use `ctx.auth`.
 * Instead they require `MCP_CONVEX_SECRET` (shared with the Next.js server only) and act
 * as one fixed user, `MCP_USER_TOKEN_IDENTIFIER`. Both are Convex environment variables.
 * Without them every call fails: the MCP is off by default.
 */

/** Compares in time that does not depend on where the strings differ. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function requireMcpUser(ctx: QueryCtx, secret: string): Promise<Doc<"users">> {
  const expected = process.env.MCP_CONVEX_SECRET;
  const tokenIdentifier = process.env.MCP_USER_TOKEN_IDENTIFIER;
  if (!expected || !tokenIdentifier || !constantTimeEqual(secret, expected)) {
    throw new DomainException("NOT_AUTHENTICATED");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  if (!user) {
    throw new DomainException("NOT_AUTHENTICATED", "MCP user not found");
  }
  return user;
}

/** Same data as `projects.list`, for the MCP user. */
export const listProjects = query({
  args: { secret: v.string() },
  returns: v.array(projectWithTasksValidator),
  handler: async (ctx, args) => {
    const user = await requireMcpUser(ctx, args.secret);
    return await listProjectsWithTasks(ctx, user._id);
  },
});

/** One task with its project's name, or null when it does not exist or is not the MCP user's. */
export const getTask = query({
  args: { secret: v.string(), taskId: v.id("tasks") },
  returns: v.union(
    v.object({
      task: taskValidator,
      project: v.object({ _id: v.id("projects"), name: v.string() }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await requireMcpUser(ctx, args.secret);
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    const project = await ctx.db.get(task.projectId);
    if (!project || project.ownerId !== user._id) return null;
    return {
      task: toTaskDto(task),
      project: { _id: project._id, name: project.name },
    };
  },
});
