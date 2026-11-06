import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const taskStatus = v.union(
  v.literal("pendiente"),
  v.literal("en_progreso"),
  v.literal("completada")
);

const taskPriority = v.union(v.literal("baja"), v.literal("media"), v.literal("alta"));

const projectStatus = v.union(
  v.literal("activo"),
  v.literal("en_pausa"),
  v.literal("completado")
);

const projectPriority = v.union(
  v.literal("alta"),
  v.literal("media"),
  v.literal("baja"),
  v.literal("ninguna")
);

const taskRecurrence = v.union(v.literal("diaria"), v.literal("laboral"), v.literal("semanal"));

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
    // Optional: projects created before these fields are "activo" with priority "ninguna".
    priority: v.optional(projectPriority),
    status: v.optional(projectStatus),
    dueDate: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_name", ["ownerId", "name"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    // Historical source of truth; `status` is kept in sync with it.
    isCompleted: v.boolean(),
    position: v.number(),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    dueDate: v.optional(v.number()),
    // true = no deadline by nature (habit, open task); absent = false.
    noDeadline: v.optional(v.boolean()),
    estimatedHours: v.optional(v.number()),
    // When set, completing the task reopens it with the next due date.
    recurrence: v.optional(taskRecurrence),
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
