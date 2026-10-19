import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import {
  normalizePriority,
  resolveTaskStatus,
  type TaskPriority,
  type TaskStatus,
} from "./taskFields";

export const subtaskValidator = v.object({
  id: v.string(),
  title: v.string(),
  isCompleted: v.boolean(),
});

export const taskStatusValidator = v.union(
  v.literal("pendiente"),
  v.literal("en_progreso"),
  v.literal("completada")
);

export const taskPriorityValidator = v.union(
  v.literal("baja"),
  v.literal("media"),
  v.literal("alta")
);

/** Shape returned to clients: status/priority always normalized to the Spanish literals. */
export const taskValidator = v.object({
  _id: v.id("tasks"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  title: v.string(),
  isCompleted: v.boolean(),
  position: v.number(),
  status: taskStatusValidator,
  priority: v.optional(taskPriorityValidator),
  dueDate: v.optional(v.number()),
  estimatedHours: v.optional(v.number()),
  notes: v.optional(v.string()),
  assignee: v.optional(v.string()),
  subtasks: v.optional(v.array(subtaskValidator)),
});

export interface TaskDto extends Omit<Doc<"tasks">, "status" | "priority"> {
  status: TaskStatus;
  priority?: TaskPriority;
}

export function toTaskDto(task: Doc<"tasks">): TaskDto {
  const { status, priority, ...rest } = task;
  const normalizedPriority = normalizePriority(priority);
  return {
    ...rest,
    status: resolveTaskStatus({ isCompleted: task.isCompleted, status }),
    ...(normalizedPriority ? { priority: normalizedPriority } : {}),
  };
}
