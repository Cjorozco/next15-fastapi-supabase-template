import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectCard } from '@/components/ProjectCard';
import type { Project } from '@/types';

// Mock useMutation hooks to avoid real API calls in tests
vi.mock('@/hooks/useTasks', () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));

// Mock next/link since jsdom doesn't do routing
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockProject: Project = {
  id: 1,
  name: 'Proyecto Test',
  description: 'Descripción de prueba',
  owner_id: 1,
  tasks: [
    { id: 1, title: 'Tarea 1', is_completed: true, project_id: 1 },
    { id: 2, title: 'Tarea 2', is_completed: false, project_id: 1 },
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
    expect(link).toHaveAttribute('href', '/projects/1');
  });
});
