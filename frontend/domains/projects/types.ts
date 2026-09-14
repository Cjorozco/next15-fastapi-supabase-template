import { Id } from '@/convex/_generated/dataModel';
import { Task } from '@/domains/tasks/types';

export type { Task };

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
