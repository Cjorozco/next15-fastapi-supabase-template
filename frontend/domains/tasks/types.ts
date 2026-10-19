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

