import { mutation, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireProjectOwner } from "./lib/authorization";
import { DomainException } from "./lib/errors";
import {
  taskPriorityValidator,
  taskRecurrenceValidator,
  taskStatusValidator,
  taskValidator,
  toTaskDto,
} from "./lib/taskDto";
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_NOTES_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  MAX_TASKS_PER_REQUEST,
  isDoneForNow,
  moveOffWeekend,
  nextOccurrence,
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
    await reopenProjectIfCompleted(ctx, args.projectId);

    const task = await ctx.db.get(taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Failed to create task");
    }

    return toTaskDto(task);
  },
});

/**
 * Completing a recurring task does not close it: it is reopened with the next due date.
 * Returns null when the task does not repeat.
 *
 * Subtasks keep their progress, so tomorrow continues with the next one. A task with
 * subtasks can be advanced several times in a day (one subtask, then another): once its
 * date is already after today, the date is not moved again.
 */
function reopenPatchIfRecurring(
  task: Pick<Doc<"tasks">, "recurrence" | "dueDate" | "subtasks">,
  tzOffsetMinutes: number | undefined
): Partial<Doc<"tasks">> | null {
  if (!task.recurrence) return null;
  const now = Date.now();
  const alreadyAdvancedToday =
    (task.subtasks?.length ?? 0) > 0 && isDoneForNow(task, now, tzOffsetMinutes);
  return {
    isCompleted: false,
    status: "pendiente",
    ...(alreadyAdvancedToday
      ? {}
      : {
          dueDate: nextOccurrence({
            dueDate: task.dueDate,
            recurrence: task.recurrence,
            now,
            tzOffsetMinutes,
          }),
        }),
    ...(task.subtasks ? { subtasks: task.subtasks } : {}),
  };
}

/**
 * A "completado" project that gets an open task again (new task, task or subtask
 * un-completed) is active again. Marking a project completed stays manual.
 */
async function reopenProjectIfCompleted(ctx: MutationCtx, projectId: Id<"projects">) {
  const project = await ctx.db.get(projectId);
  if (project?.status === "completado") {
    await ctx.db.patch(projectId, { status: "activo" });
  }
}

async function nextPositionInProject(ctx: MutationCtx, projectId: Id<"projects">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return tasks.reduce((max, task) => Math.max(max, task.position), -1) + 1;
}

async function reindexProjectTasks(ctx: MutationCtx, projectId: Id<"projects">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  tasks.sort((a, b) => a.position - b.position);
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].position !== i) {
      await ctx.db.patch(tasks[i]._id, { position: i });
    }
  }
}

/** Creates one task per title (bulk paste). Blank lines are ignored. */
export const createMany = mutation({
  args: {
    projectId: v.id("projects"),
    titles: v.array(v.string()),
  },
  returns: v.array(taskValidator),
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    const titles = args.titles.map((title) => title.trim()).filter(Boolean);
    if (titles.length === 0) {
      throw new DomainException("INVALID_INPUT", "Task title is required");
    }
    if (titles.length > MAX_TASKS_PER_REQUEST) {
      throw new DomainException(
        "INVALID_INPUT",
        `Cannot create more than ${MAX_TASKS_PER_REQUEST} tasks at once`
      );
    }
    titles.forEach(requireValidTitle);

    let position = await nextPositionInProject(ctx, args.projectId);
    const created = [];
    for (const title of titles) {
      const taskId = await ctx.db.insert("tasks", {
        projectId: args.projectId,
        title,
        isCompleted: false,
        status: "pendiente",
        position: position++,
        subtasks: [],
      });
      const task = await ctx.db.get(taskId);
      if (task) created.push(toTaskDto(task));
    }
    await reopenProjectIfCompleted(ctx, args.projectId);
    return created;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    isCompleted: v.boolean(),
    // `Date#getTimezoneOffset()` of the user, to compute recurring dates in their calendar.
    tzOffsetMinutes: v.optional(v.number()),
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

    const reopenPatch =
      args.isCompleted && !task.isCompleted
        ? reopenPatchIfRecurring(task, args.tzOffsetMinutes)
        : null;

    await ctx.db.patch(
      args.taskId,
      reopenPatch ?? {
        isCompleted: args.isCompleted,
        status: statusAfterCompletion(resolveTaskStatus(task), args.isCompleted),
        ...(updatedSubtasks ? { subtasks: updatedSubtasks } : {}),
      }
    );
    if (task.isCompleted && !args.isCompleted) {
      await reopenProjectIfCompleted(ctx, task.projectId);
    }

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
    // true = no deadline by nature: also clears the date. Setting a date turns it off.
    noDeadline: v.optional(v.boolean()),
    estimatedHours: v.optional(v.union(v.number(), v.null())),
    priority: v.optional(v.union(taskPriorityValidator, v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    recurrence: v.optional(v.union(taskRecurrenceValidator, v.null())),
    // Moves the task to another project of the same owner (subtasks, notes, status and
    // priority are kept; it goes to the end of the target project).
    projectId: v.optional(v.id("projects")),
    tzOffsetMinutes: v.optional(v.number()),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const patch: Partial<Doc<"tasks">> = {};

    const movesProject = args.projectId !== undefined && args.projectId !== task.projectId;
    if (movesProject) {
      await requireProjectOwner(ctx, args.projectId!);
      patch.projectId = args.projectId;
      patch.position = await nextPositionInProject(ctx, args.projectId!);
    }

    if (args.recurrence !== undefined) {
      patch.recurrence = args.recurrence ?? undefined;
    }

    if (args.title !== undefined) {
      patch.title = requireValidTitle(args.title);
    }

    if (args.dueDate !== undefined) {
      if (args.dueDate !== null && (!Number.isFinite(args.dueDate) || args.dueDate <= 0)) {
        throw new DomainException("INVALID_INPUT", "Invalid due date");
      }
      patch.dueDate = args.dueDate ?? undefined;
    }

    if (args.noDeadline === true) {
      if (args.dueDate !== undefined && args.dueDate !== null) {
        throw new DomainException("INVALID_INPUT", "A task cannot have a due date and no deadline");
      }
      patch.noDeadline = true;
      patch.dueDate = undefined;
    } else if (args.noDeadline === false || (args.dueDate !== undefined && args.dueDate !== null)) {
      patch.noDeadline = false;
    }

    const recurrence = "recurrence" in patch ? patch.recurrence : task.recurrence;

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
      // Same rule as the checkbox: completing a task completes its subtasks, except in a
      // recurring one, where it only means "that is all for today" and progress is kept.
      if (isCompleted && task.subtasks && !recurrence) {
        patch.subtasks = task.subtasks.map((subtask) => ({
          ...subtask,
          isCompleted: true,
        }));
      }
      // A recurring task that gets completed is reopened with its next due date.
      if (isCompleted && !task.isCompleted) {
        const reopenPatch = reopenPatchIfRecurring(
          {
            recurrence,
            dueDate: "dueDate" in patch ? patch.dueDate : task.dueDate,
            subtasks: task.subtasks,
          },
          args.tzOffsetMinutes
        );
        if (reopenPatch) Object.assign(patch, reopenPatch);
      }
    } else if (task.status !== resolveTaskStatus(task)) {
      // Lazily normalize legacy / missing status while the document is being edited.
      patch.status = resolveTaskStatus(task);
    }

    // A Monday to Friday task never has a weekend date: a task already dated for tomorrow
    // (Saturday) comes back on Monday when it is switched to this recurrence. This goes
    // after the completion above, which must start from the original date: from Monday it
    // would advance again, to Tuesday.
    const dueDate = "dueDate" in patch ? patch.dueDate : task.dueDate;
    if (recurrence === "laboral" && dueDate !== undefined) {
      const weekdayDate = moveOffWeekend(dueDate, args.tzOffsetMinutes);
      if (weekdayDate !== dueDate) patch.dueDate = weekdayDate;
    }

    await ctx.db.patch(args.taskId, patch);
    if (task.isCompleted && patch.isCompleted === false) {
      await reopenProjectIfCompleted(ctx, patch.projectId ?? task.projectId);
    }
    if (movesProject) {
      await reindexProjectTasks(ctx, task.projectId);
    }

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
    await reopenProjectIfCompleted(ctx, task.projectId);

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
    tzOffsetMinutes: v.optional(v.number()),
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

    // In a recurring task, checking a subtask means "worked on it today": the task is
    // done for today (it comes back on its next date) and the progress is kept. Finishing
    // the last subtask finishes the task for good (it is a plan that came to an end); the
    // client then offers to restart it.
    const progressPatch =
      args.isCompleted && !task.isCompleted
        ? reopenPatchIfRecurring({ ...task, subtasks: updatedSubtasks }, args.tzOffsetMinutes)
        : null;
    const patch: Partial<Doc<"tasks">> = progressPatch
      ? allCompleted
        ? { ...progressPatch, isCompleted: true, status: "completada" }
        : progressPatch
      : {
          subtasks: updatedSubtasks,
          isCompleted: allCompleted,
          status: statusAfterCompletion(resolveTaskStatus(task), allCompleted),
        };

    await ctx.db.patch(args.taskId, patch);
    if (task.isCompleted && !allCompleted) {
      await reopenProjectIfCompleted(ctx, task.projectId);
    }

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

export const updateSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
    title: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const title = requireValidTitle(args.title);
    const subtasks = task.subtasks ?? [];
    if (!subtasks.some((subtask) => subtask.id === args.subtaskId)) {
      throw new DomainException("ENTITY_NOT_FOUND", "Subtask not found");
    }

    await ctx.db.patch(args.taskId, {
      subtasks: subtasks.map((subtask) =>
        subtask.id === args.subtaskId ? { ...subtask, title } : subtask
      ),
    });

    const updated = await ctx.db.get(args.taskId);
    if (!updated) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    return toTaskDto(updated);
  },
});

/** Moves a subtask one place up or down. Moving past either end is a no-op. */
export const moveSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new DomainException("ENTITY_NOT_FOUND", "Task not found");
    }

    await requireProjectOwner(ctx, task.projectId);

    const subtasks = [...(task.subtasks ?? [])];
    const from = subtasks.findIndex((subtask) => subtask.id === args.subtaskId);
    if (from === -1) {
      throw new DomainException("ENTITY_NOT_FOUND", "Subtask not found");
    }

    const to = args.direction === "up" ? from - 1 : from + 1;
    if (to >= 0 && to < subtasks.length) {
      [subtasks[from], subtasks[to]] = [subtasks[to], subtasks[from]];
      await ctx.db.patch(args.taskId, { subtasks });
    }

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
