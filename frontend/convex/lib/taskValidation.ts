import { DomainException } from "./errors";
import {
  MAX_ESTIMATED_HOURS,
  MAX_TASK_TITLE_LENGTH,
} from "./taskFields";

/**
 * Server-side bounds for the planning fields of a task created in bulk (AI drafts).
 * The client is not trusted, so every value is checked again here.
 */
export function assertValidTaskPlanning(task: {
  title: string;
  estimatedHours?: number;
  dueDate?: number;
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
}
