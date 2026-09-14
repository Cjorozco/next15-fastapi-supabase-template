import { Id } from '@/convex/_generated/dataModel';

export interface Task {
  _id: Id<'tasks'>;
  projectId: Id<'projects'>;
  title: string;
  isCompleted: boolean;
  position: number;
}
