import { Id } from '@/convex/_generated/dataModel';
import type { TaskPriority, TaskStatus } from '@/convex/lib/taskFields';

export type { TaskPriority, TaskStatus };

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  _id: Id<'tasks'>;
  projectId: Id<'projects'>;
  title: string;
  isCompleted: boolean;
  position: number;
  /** Missing on old documents: derive it with `resolveTaskStatus`. */
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number;
  estimatedHours?: number;
  notes?: string;
  assignee?: string;
  subtasks?: Subtask[];
}


/** Payload of the task edit form. `null` clears an optional value. */
export interface TaskDetailsInput {
  title: string;
  status: TaskStatus;
  dueDate: number | null;
  estimatedHours: number | null;
  priority: TaskPriority | null;
  notes: string | null;
}
