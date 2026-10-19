import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { normalizePriority, resolveTaskStatus } from "./lib/taskFields";

const DEFAULT_BATCH_SIZE = 100;

/**
 * Fields to patch so a task matches the current model, or null when it is already up
 * to date. Never touches `isCompleted`: the boolean stays the source of truth and
 * `status` is derived from it (see `resolveTaskStatus`).
 */
export function taskBackfillPatch(
  task: Doc<"tasks">
): Pick<Doc<"tasks">, "status" | "priority"> | null {
  const status = resolveTaskStatus(task);
  const priority = normalizePriority(task.priority);

  if (task.status === status && task.priority === priority) {
    return null;
  }

  return { status, priority };
}

/**
 * Idempotent backfill: fills `status` from `isCompleted` where missing and rewrites the
 * legacy English status/priority literals to Spanish. Processes one page per run and
 * schedules itself for the next one until the table is exhausted.
 *
 * Run once per deployment:
 *   npx convex run migrations:backfillTaskFields            (dev)
 *   npx convex run migrations:backfillTaskFields --prod     (production)
 */
export const backfillTaskFields = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
    const page = await ctx.db
      .query("tasks")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let updated = 0;
    for (const task of page.page) {
      const patch = taskBackfillPatch(task);
      if (patch) {
        await ctx.db.patch(task._id, patch);
        updated++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillTaskFields, {
        cursor: page.continueCursor,
        batchSize,
      });
    }

    return { processed: page.page.length, updated, isDone: page.isDone };
  },
});

/**
 * Verification helper: how many tasks still need the backfill (bounded scan).
 *   npx convex run migrations:countTasksPendingBackfill --prod
 */
export const countTasksPendingBackfill = internalQuery({
  args: {},
  returns: v.object({ scanned: v.number(), pending: v.number() }),
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").take(5000);
    return {
      scanned: tasks.length,
      pending: tasks.filter((task) => taskBackfillPatch(task) !== null).length,
    };
  },
});
