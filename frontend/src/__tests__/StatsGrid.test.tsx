import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsGrid } from '@/components/StatsGrid';
import type { Project } from '@/types';
import type { Id } from '../../convex/_generated/dataModel';

const mockProjects: Project[] = [
  {
    _id: 'project_1' as Id<'projects'>,
    name: 'Proyecto A',
    description: '',
    ownerId: 'user_1' as Id<'users'>,
    tasks: [
      { _id: 'task_1' as Id<'tasks'>, title: 'Tarea 1', isCompleted: true, position: 0, projectId: 'project_1' as Id<'projects'> },
      { _id: 'task_2' as Id<'tasks'>, title: 'Tarea 2', isCompleted: false, position: 1, projectId: 'project_1' as Id<'projects'> },
    ],
  },
  {
    _id: 'project_2' as Id<'projects'>,
    name: 'Proyecto B',
    description: '',
    ownerId: 'user_1' as Id<'users'>,
    tasks: [
      { _id: 'task_3' as Id<'tasks'>, title: 'Tarea 3', isCompleted: true, position: 0, projectId: 'project_2' as Id<'projects'> },
    ],
  },
];

describe('StatsGrid', () => {
  it('shows active projects count', () => {
    render(<StatsGrid projects={mockProjects} />);
    expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows pending tasks count (total - completed)', () => {
    render(<StatsGrid projects={mockProjects} />);
    // 3 total - 2 completed = 1 pending
    expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows overall completion rate percentage', () => {
    render(<StatsGrid projects={mockProjects} />);
    // 2 completed out of 3 total = 67%
    expect(screen.getByText('67%')).toBeInTheDocument();
  });
});
