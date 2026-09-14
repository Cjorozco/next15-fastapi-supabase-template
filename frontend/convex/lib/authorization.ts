import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { DomainException } from "./errors";

/**
 * Validates that the request is authenticated and returns the user record.
 * Use at the start of every mutation and sensitive query.
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new DomainException("NOT_AUTHENTICATED");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new DomainException("NOT_AUTHENTICATED", "User record not found");
  }

  return user;
}

/**
 * Validates that the given project belongs to the authenticated user.
 */
export async function requireProjectOwner(
  ctx: QueryCtx | MutationCtx,
  projectId: Doc<"projects">["_id"]
): Promise<Doc<"projects">> {
  const user = await requireAuthenticatedUser(ctx);
  const project = await ctx.db.get(projectId);

  if (!project || project.ownerId !== user._id) {
    throw new DomainException("ENTITY_NOT_FOUND", "Project not found");
  }

  return project;
}
