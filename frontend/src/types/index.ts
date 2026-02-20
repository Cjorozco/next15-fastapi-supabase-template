export interface Task {
  id: number;
  title: string;
  is_completed: boolean;
  project_id: number;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  tasks: Task[];
}

export interface User {
  id: number;
  email: string;
  name?: string;
}
