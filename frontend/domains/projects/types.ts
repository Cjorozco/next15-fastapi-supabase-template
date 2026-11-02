import { Id } from '@/convex/_generated/dataModel';
import { Task } from '@/domains/tasks/types';
import type { ProjectPriority, ProjectStatus } from '@/convex/lib/projectFields';

export type { ProjectPriority, ProjectStatus };

export type { Task };

export interface Project {
  _id: Id<'projects'>;
  ownerId: Id<'users'>;
  name: string;
  description?: string;
  /** Missing on old documents: resolve with `resolveProjectPriority` ("ninguna"). */
  priority?: ProjectPriority;
  /** Missing on old documents: resolve with `resolveProjectStatus` ("activo"). */
  status?: ProjectStatus;
  dueDate?: number;
  tasks: Task[];
}

export interface User {
  _id: Id<'users'>;
  email: string;
}

export type { AiProject, AiTask } from './schemas/ai-project.schema';
export { AiProjectSchema, AiTaskSchema, validateAiProjectResponse } from './schemas/ai-project.schema';
