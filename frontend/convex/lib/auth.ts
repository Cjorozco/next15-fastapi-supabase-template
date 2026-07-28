import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getProjectForUser(
  ctx: QueryCtx | MutationCtx,
  projectId: Doc<"projects">["_id"]
): Promise<Doc<"projects">> {
  const user = await getCurrentUser(ctx);
  const project = await ctx.db.get("projects", projectId);

  if (!project || project.ownerId !== user._id) {
    throw new Error("Project not found");
  }

  return project;
}
