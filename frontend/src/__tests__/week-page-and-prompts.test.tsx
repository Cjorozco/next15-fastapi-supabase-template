import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Project } from '@/domains/projects/types';
import type { Id } from '@/convex/_generated/dataModel';
import { buildProjectSystemInstruction, TASK_QUALITY_RULES } from '@/shared/lib/ai/ai-gateway';
import { buildRefinementSystemInstruction } from '@/domains/projects/components/RefineProjectWithAiModal';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const startOfToday = new Date(new Date(NOW).setHours(0, 0, 0, 0)).getTime();

const projects: Project[] = [
  {
    _id: 'p1' as Id<'projects'>,
    ownerId: 'u1' as Id<'users'>,
    name: 'Inglés B2',
    tasks: [
      { _id: 't1' as Id<'tasks'>, projectId: 'p1' as Id<'projects'>, title: 'Vencida', isCompleted: false, position: 0, dueDate: startOfToday - 3 * DAY },
      { _id: 't2' as Id<'tasks'>, projectId: 'p1' as Id<'projects'>, title: 'Falta fecha', isCompleted: false, position: 1 },
      { _id: 't3' as Id<'tasks'>, projectId: 'p1' as Id<'projects'>, title: 'Hábito', isCompleted: false, position: 2, noDeadline: true },
    ],
  },
];

vi.mock('@/domains/projects/hooks/useProjects', () => ({
  useProjects: () => ({ data: projects, isLoading: false }),
}));
vi.mock('@/domains/tasks/hooks/useTaskMutations', () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/shared/components/layout/Header', () => ({ Header: () => null }));
vi.mock('@/shared/components/layout/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import WeekPage from '@/src/app/(dashboard)/week/page';

describe('Esta semana page', () => {
  it('shows the new counter line', () => {
    render(<WeekPage />);
    expect(screen.getByText(/1 vencida/)).toBeInTheDocument();
    expect(screen.getByText(/0 esta semana · 0 más adelante/)).toBeInTheDocument();
    expect(screen.getByText(/1 sin planificar/)).toBeInTheDocument();
    expect(screen.getByText(/1 sin límite/)).toBeInTheDocument();
  });

  it('flags the undated task as "Sin planificar" and the habit as "Sin límite"', () => {
    render(<WeekPage />);
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText('Vencida')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Falta fecha')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Sin planificar')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Sin límite')).toBeInTheDocument();
  });

  it('filters to the tasks that still need a date', () => {
    render(<WeekPage />);
    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: 'sin_planificar' } });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Falta fecha')).toBeInTheDocument();
    expect(screen.queryByText('Hábito')).not.toBeInTheDocument();
  });

  it('names the project link "Abrir proyecto <nombre>" without stray visible text', () => {
    render(<WeekPage />);
    const links = screen.getAllByRole('link', { name: 'Abrir proyecto Inglés B2' });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/projects/p1');
    expect(document.body.textContent).not.toContain(': abrir proyecto');
  });
});

describe('AI prompts', () => {
  it('require a date or noDeadline on every task and never both empty', () => {
    expect(TASK_QUALITY_RULES).toContain('"noDeadline": true');
    expect(TASK_QUALITY_RULES).toMatch(/NUNCA dejes una tarea sin ninguno de los dos/);
  });

  it('tell the model to spread dates by the rhythm the user gave', () => {
    expect(TASK_QUALITY_RULES).toContain('3 h por semana');
    expect(TASK_QUALITY_RULES).toMatch(/reparte las fechas/i);
  });

  it('forbid inventing modules or syllabi and offer generic sessions', () => {
    expect(TASK_QUALITY_RULES).toMatch(/No inventes nombres de módulos/);
    expect(TASK_QUALITY_RULES).toContain('Sesión 1 de 8 – 2 h');
  });

  it('are shared by Generar and Refinar con IA', () => {
    expect(buildProjectSystemInstruction()).toContain(TASK_QUALITY_RULES);
    expect(buildRefinementSystemInstruction()).toContain(TASK_QUALITY_RULES);
  });
});
