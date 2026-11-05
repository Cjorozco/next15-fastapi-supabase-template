import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '@/domains/projects/types';
import type { Id } from '@/convex/_generated/dataModel';

const DAY = 24 * 60 * 60 * 1000;
const BOGOTA_OFFSET = 5 * 60 * 60 * 1000;
// Noon today in Bogotá is far from any day boundary, so the test is stable at any hour.
const todayNoon = Math.floor((Date.now() - BOGOTA_OFFSET) / DAY) * DAY + DAY / 2 + BOGOTA_OFFSET;
const yesterday = todayNoon - DAY;

let projects: Project[];
const updateTask = vi.fn();
const toggleSubtask = vi.fn();

vi.mock('@/domains/projects/hooks/useProjects', () => ({
  useProjects: () => ({ data: projects, isLoading: false }),
}));
vi.mock('@/domains/tasks/hooks/useTaskMutations', () => ({
  useUpdateTask: () => ({ mutate: updateTask }),
  useToggleSubtask: () => ({ mutate: toggleSubtask }),
}));
vi.mock('@/shared/components/layout/Header', () => ({ Header: () => null }));
vi.mock('@/shared/components/layout/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import TodayPage from '@/src/app/(dashboard)/hoy/page';

const taskId = (value: string) => value as Id<'tasks'>;
const projectId = (value: string) => value as Id<'projects'>;

beforeEach(() => {
  updateTask.mockReset();
  toggleSubtask.mockReset();
  projects = [
    {
      _id: projectId('p1'),
      ownerId: 'u1' as Id<'users'>,
      name: 'Activo',
      tasks: [
        { _id: taskId('t1'), projectId: projectId('p1'), isCompleted: false, title: 'De hoy', position: 0, dueDate: todayNoon, priority: 'alta' },
        { _id: taskId('t2'), projectId: projectId('p1'), isCompleted: false, title: 'Sin fecha', position: 1 },
        { _id: taskId('t3'), projectId: projectId('p1'), isCompleted: false, title: 'Atrasada', position: 2, dueDate: yesterday },
        {
          _id: taskId('t4'),
          projectId: projectId('p1'),
          isCompleted: false,
          title: 'Con subtareas',
          position: 3,
          dueDate: todayNoon,
          recurrence: 'diaria',
          subtasks: [
            { id: 's1', title: 'Primera', isCompleted: true },
            { id: 's2', title: 'Segunda', isCompleted: false },
          ],
        },
      ],
    },
    {
      _id: projectId('p2'),
      ownerId: 'u1' as Id<'users'>,
      name: 'Pausado',
      status: 'en_pausa',
      tasks: [
        { _id: taskId('t5'), projectId: projectId('p2'), isCompleted: false, title: 'De proyecto en pausa', position: 0, dueDate: todayNoon },
      ],
    },
  ];
});

describe('Hoy page', () => {
  it('lists today and overdue tasks, and hides undated and paused-project ones', () => {
    render(<TodayPage />);
    expect(screen.getByText('De hoy')).toBeInTheDocument();
    expect(screen.getByText('Atrasada')).toBeInTheDocument();
    expect(screen.queryByText('Sin fecha')).not.toBeInTheDocument();
    expect(screen.queryByText('De proyecto en pausa')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Vencidas/ })).toBeInTheDocument();
  });

  it('shows subtask progress and the next pending subtask', () => {
    render(<TodayPage />);
    const row = screen.getByText('Con subtareas').closest('li') as HTMLElement;
    expect(within(row).getByText(/1\/2/)).toBeInTheDocument();
    expect(within(row).getByText('Segunda')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('checkbox', { name: 'Completar subtarea Segunda' }));
    expect(toggleSubtask).toHaveBeenCalledWith({ taskId: 't4', subtaskId: 's2', isCompleted: true });
  });

  it('completes a task with the app mutation, shows the tick and counts it as done once it leaves the list', async () => {
    const { rerender } = render(<TodayPage />);
    expect(screen.getByText('0 de 3 hechas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Completar De hoy' }));
    expect(updateTask).toHaveBeenCalledWith({ taskId: 't1', isCompleted: true });
    // The tick is shown right away: checked and struck through.
    expect(screen.getByRole('checkbox', { name: 'Completar De hoy' })).toBeChecked();
    expect(screen.getByText('De hoy').closest('li')).toHaveAttribute('data-status', 'done');

    // Convex pushes the update: the task is no longer pending.
    projects = [{ ...projects[0], tasks: projects[0].tasks.filter((t) => t._id !== 't1') }, projects[1]];
    rerender(<TodayPage />);
    // It stays on screen for a moment so the tick can be seen, then leaves.
    expect(screen.getByText('De hoy')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 hechas')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('De hoy')).not.toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('1 de 3 hechas')).toBeInTheDocument();
  });

  it('shows the empty state with a link to /week', () => {
    projects = [];
    render(<TodayPage />);
    expect(screen.getByText('Nada pendiente para hoy 🎉')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver esta semana' })).toHaveAttribute('href', '/week');
  });
});
