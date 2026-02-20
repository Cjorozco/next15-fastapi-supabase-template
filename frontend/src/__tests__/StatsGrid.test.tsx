import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsGrid } from '@/components/StatsGrid';
import type { Project } from '@/types';

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Proyecto A',
    description: '',
    owner_id: 1,
    tasks: [
      { id: 1, title: 'Tarea 1', is_completed: true, project_id: 1 },
      { id: 2, title: 'Tarea 2', is_completed: false, project_id: 1 },
    ],
  },
  {
    id: 2,
    name: 'Proyecto B',
    description: '',
    owner_id: 1,
    tasks: [
      { id: 3, title: 'Tarea 3', is_completed: true, project_id: 2 },
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
