import { mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireProjectOwner } from "./lib/authorization";
import { DomainException } from "./lib/errors";
import {
  taskPriorityValidator,
  taskStatusValidator,
  taskValidator,
  toTaskDto,
} from "./lib/taskDto";
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_NOTES_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  resolveTaskStatus,
  statusAfterCompletion,
} from "./lib/taskFields";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    const title = args.title.trim();
    if (!title) {
      throw new DomainException("INVALID_INPUT", "Task title is required");
    }

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const nextPosition =
      existingTasks.reduce((max, task) => Math.max(max, task.position), -1) + 1;

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title,
      isCompleted: false,
      status: "pendiente",
      position: nextPosition,
      subtasks: [],
    });

    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to create task");
    }

    return toTaskDto(task);
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    isCompleted: v.boolean(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    // Si la tarea tiene subtareas, sincronizar el estado de todas las subtareas
    const updatedSubtasks = task.subtasks?.map((subtask) => ({
      ...subtask,
      isCompleted: args.isCompleted,
    }));

    await ctx.db.patch(args.taskId, {
      isCompleted: args.isCompleted,
      status: statusAfterCompletion(resolveTaskStatus(task), args.isCompleted),
      ...(updatedSubtasks ? { subtasks: updatedSubtasks } : {}),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

function requireValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new DomainException("INVALID_INPUT", "Task title is required");
  }
  if (trimmed.length > MAX_TASK_TITLE_LENGTH) {
    throw new DomainException(
      "INVALID_INPUT",
      `Task title cannot exceed ${MAX_TASK_TITLE_LENGTH} characters`
    );
  }
  return trimmed;
}

/**
 * Edits the management fields of a task. For the optional fields, `null` clears the
 * value and `undefined` (omitted) leaves it untouched. Keeps `isCompleted` and
 * `status` in sync.
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(taskStatusValidator),
    dueDate: v.optional(v.union(v.number(), v.null())),
    estimatedHours: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.union(taskPriorityValidator, v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const patch: Partial<Doc<"tasks">> = {};

    if (args.title !== undefined) {
      patch.title = requireValidTitle(args.title);
    }

    if (args.dueDate !== undefined) {
      if (args.dueDate !== null && (!Number.isFinite(args.dueDate) || args.dueDate <= 0)) {
        throw new DomainException("INVALID_INPUT", "Invalid due date");
      }
      patch.dueDate = args.dueDate ?? undefined;
    }

    if (args.estimatedHours !== undefined) {
      const hours = args.estimatedHours;
      if (
        hours !== null &&
        (!Number.isFinite(hours) || hours < 0 || hours > MAX_ESTIMATED_HOURS)
      ) {
        throw new DomainException(
          "INVALID_INPUT",
          `Estimated hours must be between 0 and ${MAX_ESTIMATED_HOURS}`
        );
      }
      patch.estimatedHours = hours ?? undefined;
    }

    if (args.priority !== undefined) {
      patch.priority = args.priority ?? undefined;
    }

    if (args.notes !== undefined) {
      const notes = args.notes?.trim() ?? "";
      if (notes.length > MAX_TASK_NOTES_LENGTH) {
        throw new DomainException(
          "INVALID_INPUT",
          `Notes cannot exceed ${MAX_TASK_NOTES_LENGTH} characters`
        );
      }
      patch.notes = notes || undefined;
    }

    if (args.status !== undefined) {
      const isCompleted = args.status === "completada";
      patch.status = args.status;
      patch.isCompleted = isCompleted;
      // Same rule as the checkbox: completing a task completes its subtasks.
      if (isCompleted && task.subtasks) {
        patch.subtasks = task.subtasks.map((subtask) => ({
          ...subtask,
          isCompleted: true,
        }));
      }
    } else if (task.status !== resolveTaskStatus(task)) {
      // Lazily normalize legacy / missing status while the document is being edited.
      patch.status = resolveTaskStatus(task);
    }

    await ctx.db.patch(args.taskId, patch);

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

export const addSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const title = args.title.trim();
    if (!title) {
      throw new DomainException("INVALID_INPUT", "Subtask title is required");
    }

    const currentSubtasks = task.subtasks || [];
    const newSubtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      isCompleted: false,
    };

    const newSubtasks = [...currentSubtasks, newSubtask];

    // Al añadir una subtarea incompleta, la tarea padre no puede estar completa
    await ctx.db.patch(args.taskId, {
      subtasks: newSubtasks,
      isCompleted: false,
      status: statusAfterCompletion(resolveTaskStatus(task), false),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

export const toggleSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
    isCompleted: v.boolean(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === args.subtaskId ? { ...st, isCompleted: args.isCompleted } : st
    );

    // Regla de negocio: al completarse todas las subtareas se completa la tarea
    const allCompleted =
      updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.isCompleted);

    await ctx.db.patch(args.taskId, {
      subtasks: updatedSubtasks,
      isCompleted: allCompleted,
      status: statusAfterCompletion(resolveTaskStatus(task), allCompleted),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

export const removeSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter((st) => st.id !== args.subtaskId);

    // Recalcular si las restantes están todas completas
    const allCompleted =
      updatedSubtasks.length > 0 ? updatedSubtasks.every((st) => st.isCompleted) : task.isCompleted;

    await ctx.db.patch(args.taskId, {
      subtasks: updatedSubtasks,
      isCompleted: allCompleted,
      status: statusAfterCompletion(resolveTaskStatus(task), allCompleted),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

export const convertTaskToSubtask = mutation({
  args: {
    sourceTaskId: v.id("tasks"),
    targetTaskId: v.id("tasks"),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    if (args.sourceTaskId === args.targetTaskId) {
      throw new DomainException(
        "INVALID_INPUT",
        "Cannot convert a task into a subtask of itself"
      );
    }

    const sourceTask = await ctx.db.get(args.sourceTaskId);
    if (!sourceTask) {
      throw new DomainException("ENTITY_NOT_FOUND", "Source task not found");
    }

    const targetTask = await ctx.db.get(args.targetTaskId);
    if (!targetTask) {
      throw new DomainException("ENTITY_NOT_FOUND", "Target task not found");
    }

    if (sourceTask.projectId !== targetTask.projectId) {
      throw new DomainException(
        "INVALID_INPUT",
        "Tasks must belong to the same project"
      );
    }

    await requireProjectOwner(ctx, targetTask.projectId);

    // 1. Convertir sourceTask en subtarea
    const newSubtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: sourceTask.title,
      isCompleted: sourceTask.isCompleted,
    };

    const sourceNestedSubtasks = sourceTask.subtasks || [];
    const targetCurrentSubtasks = targetTask.subtasks || [];
    const combinedSubtasks = [
      ...targetCurrentSubtasks,
      newSubtask,
      ...sourceNestedSubtasks,
    ];

    // 2. Verificar si todas las subtareas en el destino están completadas
    const allCompleted =
      combinedSubtasks.length > 0 && combinedSubtasks.every((s) => s.isCompleted);

    // 3. Eliminar la tarea origen del nivel superior
    await ctx.db.delete(args.sourceTaskId);

    // 4. Actualizar la tarea destino
    await ctx.db.patch(args.targetTaskId, {
      subtasks: combinedSubtasks,
      isCompleted: allCompleted,
      status: statusAfterCompletion(resolveTaskStatus(targetTask), allCompleted),
    });

    // 5. Reindexar las posiciones de las tareas restantes del proyecto
    const remainingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", targetTask.projectId))
      .collect();

    remainingTasks.sort((a, b) => a.position - b.position);
    for (let i = 0; i < remainingTasks.length; i++) {
      if (remainingTasks[i].position !== i) {
        await ctx.db.patch(remainingTasks[i]._id, { position: i });
      }
    }

    const updatedTarget = await ctx.db.get(args.targetTaskId);
    if (!updatedTarget) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to update target task");
    }

    return toTaskDto(updatedTarget);
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);
    await ctx.db.delete(args.taskId);
    return null;
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id("projects"),
    taskIds: v.array(v.id("tasks")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    for (let index = 0; index < args.taskIds.length; index++) {
      const taskId = args.taskIds[index];
      const task = await ctx.db.get(taskId);
      if (!task || task.projectId !== args.projectId) {
        throw new DomainException(
          "ENTITY_NOT_FOUND",
          "Task not found in project"
        );
      }
      await ctx.db.patch(taskId, { position: index });
    }

    return null;
  },
});
