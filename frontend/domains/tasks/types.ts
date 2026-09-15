import { Id } from '@/convex/_generated/dataModel';

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
  subtasks?: Subtask[];
}

