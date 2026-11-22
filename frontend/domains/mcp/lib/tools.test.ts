import { describe, expect, test } from 'vitest';
import type { Id } from '@/convex/_generated/dataModel';
import type { Project } from '@/domains/projects/types';
import type { Task } from '@/domains/tasks/types';
import { filterTasks, MAX_LISTED_TASKS, summarizeProjects } from './tools';

// Wednesday 18 Nov 2026, 15:00 in Bogotá (UTC-5).
const NOW = Date.UTC(2026, 10, 18, 20, 0);
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    _id: `task${seq}` as Id<'tasks'>,
    projectId: 'p1' as Id<'projects'>,
    title: `Tarea ${seq}`,
    isCompleted: false,
    position: seq,
    status: 'pendiente',
    ...overrides,
  } as Task;
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    _id: 'p1' as Id<'projects'>,
    ownerId: 'u1' as Id<'users'>,
    name: 'Proyecto',
    tasks: [],
    ...overrides,
  } as Project;
}

describe('summarizeProjects', () => {
  test('defaults the status and counts only pending tasks', () => {
    const p = project({
      tasks: [task(), task({ isCompleted: true, status: 'completada' })],
    });
    expect(summarizeProjects([p])).toEqual([
      { id: 'p1', nombre: 'Proyecto', estado: 'activo', tareasPendientes: 1 },
    ]);
  });
});

describe('filterTasks', () => {
  const today = task({ title: 'Hoy', dueDate: NOW });
  const overdue = task({ title: 'Vencida', dueDate: NOW - 2 * DAY });
  const later = task({ title: 'Mes próximo', dueDate: NOW + 30 * DAY });
  const done = task({ title: 'Hecha', dueDate: NOW, isCompleted: true, status: 'completada' });
  const active = project({ tasks: [today, overdue, later, done] });
  const paused = project({
    _id: 'p2' as Id<'projects'>,
    name: 'Pausado',
    status: 'en_pausa',
    tasks: [task({ title: 'Pausada', dueDate: NOW, projectId: 'p2' as Id<'projects'> })],
  });

  test('"hoy" matches the Hoy view: overdue first, pending only, active projects', () => {
    const { tareas } = filterTasks([active, paused], { fecha: 'hoy' }, NOW);
    expect(tareas.map((t) => [t.titulo, t.grupo])).toEqual([
      ['Vencida', 'vencida'],
      ['Hoy', 'hoy'],
    ]);
    expect(tareas[1].fecha).toBe('2026-11-18');
  });

  test('"semana" leaves out tasks due after this week', () => {
    const { tareas } = filterTasks([active], { fecha: 'semana' }, NOW);
    expect(tareas.map((t) => t.titulo)).toEqual(['Vencida', 'Hoy']);
  });

  test('without a date it lists every task and filters by status and project', () => {
    expect(filterTasks([active, paused], {}, NOW).total).toBe(5);
    expect(
      filterTasks([active, paused], { estado: 'completada' }, NOW).tareas.map((t) => t.titulo)
    ).toEqual(['Hecha']);
    expect(
      filterTasks([active, paused], { proyectoId: 'p2' }, NOW).tareas.map((t) => t.titulo)
    ).toEqual(['Pausada']);
  });
});

describe('filterTasks pagination', () => {
  test('pages through every task with "siguiente"', () => {
    const many = project({
      tasks: Array.from({ length: MAX_LISTED_TASKS + 1 }, () => task()),
    });
    const first = filterTasks([many], {}, NOW);
    expect(first.tareas).toHaveLength(MAX_LISTED_TASKS);
    expect(first.total).toBe(MAX_LISTED_TASKS + 1);
    expect(first.siguiente).toBe(MAX_LISTED_TASKS);

    const second = filterTasks([many], { desde: first.siguiente }, NOW);
    expect(second.tareas).toHaveLength(1);
    expect(second.tareas[0].id).toBe(many.tasks[MAX_LISTED_TASKS]._id);
    expect(second.siguiente).toBeUndefined();
  });
});
