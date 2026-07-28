import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectCard } from '@/components/ProjectCard';
import type { Project } from '@/types';
import type { Id } from '../../convex/_generated/dataModel';

// Mock useMutation hooks to avoid real API calls in tests
vi.mock('@/hooks/useTasks', () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
  useReorderTasks: () => ({ mutate: vi.fn() }),
}));

// Mock next/link since jsdom doesn't do routing
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockProject: Project = {
  _id: 'project_1' as Id<'projects'>,
  name: 'Proyecto Test',
  description: 'Descripción de prueba',
  ownerId: 'user_1' as Id<'users'>,
  tasks: [
    { _id: 'task_1' as Id<'tasks'>, title: 'Tarea 1', isCompleted: true, position: 0, projectId: 'project_1' as Id<'projects'> },
    { _id: 'task_2' as Id<'tasks'>, title: 'Tarea 2', isCompleted: false, position: 1, projectId: 'project_1' as Id<'projects'> },
  ],
};

describe('ProjectCard', () => {
  it('renders the project name', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
  });

  it('renders the project description', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('Descripción de prueba')).toBeInTheDocument();
  });

  it('shows correct task progress count', () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('links the title to the project detail page', () => {
    render(<ProjectCard project={mockProject} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/project_1');
  });
});
