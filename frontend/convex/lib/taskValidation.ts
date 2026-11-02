import { DomainException } from "./errors";
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_NOTES_LENGTH,
  MAX_TASK_TITLE_LENGTH,
} from "./taskFields";

const MAX_SUBTASKS_PER_TASK = 20;

/**
 * Server-side bounds for the planning fields of a task created in bulk (AI drafts).
 * The client is not trusted, so every value is checked again here.
 */
export function assertValidTaskPlanning(task: {
  title: string;
  estimatedHours?: number;
  dueDate?: number;
  noDeadline?: boolean;
  notes?: string;
  subtasks?: string[];
}): void {
  if (task.title.trim().length > MAX_TASK_TITLE_LENGTH) {
    throw new DomainException(
      "INVALID_INPUT",
      `Task title cannot exceed ${MAX_TASK_TITLE_LENGTH} characters`
    );
  }
  const hours = task.estimatedHours;
  if (hours !== undefined && (!Number.isFinite(hours) || hours < 0 || hours > MAX_ESTIMATED_HOURS)) {
    throw new DomainException(
      "INVALID_INPUT",
      `Estimated hours must be between 0 and ${MAX_ESTIMATED_HOURS}`
    );
  }
  if (task.dueDate !== undefined && (!Number.isFinite(task.dueDate) || task.dueDate <= 0)) {
    throw new DomainException("INVALID_INPUT", "Invalid due date");
  }
  if (task.notes !== undefined && task.notes.trim().length > MAX_TASK_NOTES_LENGTH) {
    throw new DomainException(
      "INVALID_INPUT",
      `Notes cannot exceed ${MAX_TASK_NOTES_LENGTH} characters`
    );
  }
  if (task.subtasks !== undefined) {
    if (task.subtasks.length > MAX_SUBTASKS_PER_TASK) {
      throw new DomainException(
        "INVALID_INPUT",
        `A task cannot have more than ${MAX_SUBTASKS_PER_TASK} subtasks`
      );
    }
    for (const title of task.subtasks) {
      if (title.trim().length > MAX_TASK_TITLE_LENGTH) {
        throw new DomainException(
          "INVALID_INPUT",
          `Subtask title cannot exceed ${MAX_TASK_TITLE_LENGTH} characters`
        );
      }
    }
  }
  if (task.dueDate !== undefined && task.noDeadline === true) {
    throw new DomainException("INVALID_INPUT", "A task cannot have a due date and no deadline");
  }
}
