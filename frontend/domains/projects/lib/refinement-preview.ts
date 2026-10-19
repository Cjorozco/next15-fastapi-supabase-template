import type { AiRefinement } from '@/domains/projects/schemas/ai-refine.schema';

export interface RefinementProjectSnapshot {
  description?: string;
  tasks: Array<{ _id: string; title: string }>;
}

export interface RefinementPreview {
  summary: string;
  /** Present only when the description would actually change. */
  description: { before: string; after: string } | null;
  newTasks: Array<{ title: string; subtasks: string[] }>;
  /** Subtasks proposed for tasks that exist in the project. */
  existingTaskSubtasks: Array<{ taskId: string; taskTitle: string; subtaskTitles: string[] }>;
  /** Proposals pointing to a task id that is not in this project (ignored). */
  skippedCount: number;
  hasChanges: boolean;
}

export interface RefinementApplyPayload {
  updatedDescription?: string;
  newTasks: Array<{ title: string; subtasks: string[] }>;
  newSubtasksForExistingTasks: Array<{ taskId: string; subtaskTitles: string[] }>;
}

/**
 * Turns the (already validated) AI proposal into what will really change, so the user
 * can review it before confirming. Anything the mutation would ignore is dropped here.
 * An empty or identical description is not a change (an empty one would wipe the
 * current description on the server).
 */
export function buildRefinementPreview(
  refinement: AiRefinement,
  project: RefinementProjectSnapshot
): RefinementPreview {
  const before = (project.description ?? '').trim();
  const proposed = refinement.updatedDescription?.trim() ?? '';
  const description = proposed && proposed !== before ? { before, after: proposed } : null;

  const titleById = new Map(project.tasks.map((task) => [String(task._id), task.title]));
  const existingTaskSubtasks: RefinementPreview['existingTaskSubtasks'] = [];
  let skippedCount = 0;

  for (const item of refinement.newSubtasksForExistingTasks) {
    const taskTitle = titleById.get(item.taskId);
    if (taskTitle === undefined) {
      skippedCount++;
      continue;
    }
    existingTaskSubtasks.push({
      taskId: item.taskId,
      taskTitle,
      subtaskTitles: item.subtaskTitles,
    });
  }

  const newTasks = refinement.newTasks.map((task) => ({
    title: task.title,
    subtasks: task.subtasks,
  }));

  return {
    summary: refinement.summary,
    description,
    newTasks,
    existingTaskSubtasks,
    skippedCount,
    hasChanges: description !== null || newTasks.length > 0 || existingTaskSubtasks.length > 0,
  };
}

/** Exactly what the user reviewed, in the shape of `projects.applyAiRefinement`. */
export function toApplyPayload(preview: RefinementPreview): RefinementApplyPayload {
  return {
    ...(preview.description ? { updatedDescription: preview.description.after } : {}),
    newTasks: preview.newTasks,
    newSubtasksForExistingTasks: preview.existingTaskSubtasks.map(({ taskId, subtaskTitles }) => ({
      taskId,
      subtaskTitles,
    })),
  };
}
