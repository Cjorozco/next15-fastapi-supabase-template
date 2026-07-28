import { Id } from '../../convex/_generated/dataModel';

export interface Task {
  _id: Id<'tasks'>;
  projectId: Id<'projects'>;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface Project {
  _id: Id<'projects'>;
  ownerId: Id<'users'>;
  name: string;
  description?: string;
  tasks: Task[];
}

export interface User {
  _id: Id<'users'>;
  email: string;
}
