import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Widen phase of widen-migrate-narrow: the legacy English literals written by the
// first demo seed stay valid until `migrations:backfillTaskFields` has normalized
// every task in production. Remove them in the follow-up "narrow" deploy.
const taskStatusStored = v.union(
  v.literal("pendiente"),
  v.literal("en_progreso"),
  v.literal("completada"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done")
);

const taskPriorityStored = v.union(
  v.literal("baja"),
  v.literal("media"),
  v.literal("alta"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  projects: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    // Historical source of truth; `status` is kept in sync with it.
    isCompleted: v.boolean(),
    position: v.number(),
    status: v.optional(taskStatusStored),
    priority: v.optional(taskPriorityStored),
    dueDate: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    notes: v.optional(v.string()),
    assignee: v.optional(v.string()),
    subtasks: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          isCompleted: v.boolean(),
        })
      )
    ),
  }).index("by_project", ["projectId"]),
});
