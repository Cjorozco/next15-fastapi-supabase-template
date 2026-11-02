import { describe, it, expect } from 'vitest';
import {
  compareProjects,
  resolveProjectPriority,
  resolveProjectStatus,
  sortAndFilterProjects,
  type ProjectPriority,
  type ProjectStatus,
} from '@/convex/lib/projectFields';

interface P {
  id: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  dueDate?: number;
}

const ids = (projects: P[]) => projects.map((p) => p.id);

describe('project defaults', () => {
  it('treats a project without the new fields as active with no priority', () => {
    expect(resolveProjectStatus({})).toBe('activo');
    expect(resolveProjectPriority({})).toBe('ninguna');
  });
});

describe('compareProjects', () => {
  it('orders by status: active, paused, completed', () => {
    const list: P[] = [
      { id: 'done', status: 'completado' },
      { id: 'paused', status: 'en_pausa' },
      { id: 'active', status: 'activo' },
      { id: 'legacy' },
    ];
    expect(ids(sortAndFilterProjects(list))).toEqual(['active', 'legacy', 'paused', 'done']);
  });

  it('orders by priority inside the same status, none last', () => {
    const list: P[] = [
      { id: 'none' },
      { id: 'low', priority: 'baja' },
      { id: 'high', priority: 'alta' },
      { id: 'mid', priority: 'media' },
    ];
    expect(ids(sortAndFilterProjects(list))).toEqual(['high', 'mid', 'low', 'none']);
  });

  it('orders by due date inside the same priority, no date last', () => {
    const list: P[] = [
      { id: 'nodate', priority: 'alta' },
      { id: 'late', priority: 'alta', dueDate: 200 },
      { id: 'soon', priority: 'alta', dueDate: 100 },
    ];
    expect(ids(sortAndFilterProjects(list))).toEqual(['soon', 'late', 'nodate']);
  });

  it('status wins over priority and priority wins over date', () => {
    const list: P[] = [
      { id: 'paused-high', status: 'en_pausa', priority: 'alta', dueDate: 1 },
      { id: 'active-low-soon', priority: 'baja', dueDate: 1 },
      { id: 'active-high-late', priority: 'alta', dueDate: 999 },
    ];
    expect(ids(sortAndFilterProjects(list))).toEqual([
      'active-high-late',
      'active-low-soon',
      'paused-high',
    ]);
  });

  it('keeps the original order for full ties (stable)', () => {
    const list: P[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(ids(sortAndFilterProjects(list))).toEqual(['a', 'b', 'c']);
    expect(compareProjects(list[0], list[1])).toBe(0);
  });

  it('does not mutate the input array', () => {
    const list: P[] = [{ id: 'b', priority: 'baja' }, { id: 'a', priority: 'alta' }];
    sortAndFilterProjects(list);
    expect(ids(list)).toEqual(['b', 'a']);
  });
});

describe('sortAndFilterProjects filters', () => {
  const list: P[] = [
    { id: 'a', priority: 'alta' },
    { id: 'b', status: 'en_pausa', priority: 'alta' },
    { id: 'c', priority: 'baja' },
    { id: 'd' },
  ];

  it('filters by status, counting legacy projects as active', () => {
    expect(ids(sortAndFilterProjects(list, { status: 'activo', priority: 'todas' }))).toEqual([
      'a',
      'c',
      'd',
    ]);
    expect(ids(sortAndFilterProjects(list, { status: 'en_pausa', priority: 'todas' }))).toEqual(['b']);
  });

  it('filters by priority, counting missing priority as none', () => {
    expect(ids(sortAndFilterProjects(list, { status: 'todos', priority: 'alta' }))).toEqual(['a', 'b']);
    expect(ids(sortAndFilterProjects(list, { status: 'todos', priority: 'ninguna' }))).toEqual(['d']);
  });

  it('combines both filters', () => {
    expect(ids(sortAndFilterProjects(list, { status: 'activo', priority: 'alta' }))).toEqual(['a']);
  });
});
