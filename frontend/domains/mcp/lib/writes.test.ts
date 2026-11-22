import { describe, expect, test } from 'vitest';
import { fromDateInputValue } from '@/domains/tasks/lib/dates';
import { dayKey } from '@/domains/tasks/lib/timezone';
import {
  bogotaMidnight,
  describeTask,
  summarizeCreatedProject,
  summarizeEditedProject,
  summarizeEditedTask,
  summarizeMovedTask,
  summarizeProjectStatus,
  toProjectTasks,
} from './writes';

describe('bogotaMidnight', () => {
  test('is midnight in Bogotá and lands on the same calendar day', () => {
    const ts = bogotaMidnight('2026-11-25')!;
    expect(ts).toBe(Date.UTC(2026, 10, 25, 5));
    expect(dayKey(ts)).toBe('2026-11-25');
  });

  test('matches the app date picker when the browser is in Bogotá', () => {
    // Vitest runs in the machine's zone; compare only when that zone is UTC-5.
    if (new Date(2026, 10, 25).getTimezoneOffset() === 300) {
      expect(bogotaMidnight('2026-11-25')).toBe(fromDateInputValue('2026-11-25'));
    }
  });

  test('rejects malformed or impossible dates', () => {
    for (const value of ['2026-02-30', '25/11/2026', '2026-13-01', '']) {
      expect(bogotaMidnight(value)).toBeNull();
    }
  });
});

describe('toProjectTasks', () => {
  test('keeps order as position and converts dates', () => {
    const result = toProjectTasks([
      { titulo: 'Uno', fecha: '2026-11-25', prioridad: 'alta' },
      { titulo: 'Dos' },
    ]);
    expect(result).toEqual({
      ok: true,
      tasks: [
        { title: 'Uno', position: 0, dueDate: Date.UTC(2026, 10, 25, 5), priority: 'alta' },
        { title: 'Dos', position: 1 },
      ],
    });
  });

  test('reports the task with a bad date', () => {
    const result = toProjectTasks([{ titulo: 'Mala', fecha: '2026-02-30' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('«Mala»');
  });

  test('refuses more tasks than the backend accepts at once', () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ titulo: `T${i}` }));
    expect(toProjectTasks(many).ok).toBe(false);
  });
});

describe('summaries', () => {
  const due = Date.UTC(2026, 10, 25, 5);

  test('describes a task with its date and priority', () => {
    expect(describeTask({ title: 'Leer', status: 'pendiente', dueDate: due, priority: 'alta' })).toBe(
      '«Leer» (pendiente, 2026-11-25, prioridad alta)'
    );
  });

  test('lists the tasks of a created project', () => {
    const text = summarizeCreatedProject({
      name: 'AI Engineer (estudio)',
      tasks: [{ title: 'Leer', status: 'pendiente', dueDate: due }],
    });
    expect(text).toContain('Creado el proyecto «AI Engineer (estudio)»');
    expect(text).toContain('- «Leer» (pendiente, 2026-11-25)');
  });

  test('explains a status change', () => {
    expect(
      summarizeMovedTask(
        { title: 'Leer', status: 'pendiente' },
        { title: 'Leer', status: 'en_progreso' },
        'en_progreso',
        'Estudio'
      )
    ).toBe('«Leer» en «Estudio»: pendiente → en progreso.');
  });

  test('explains that a completed recurring task reopens', () => {
    const text = summarizeMovedTask(
      { title: 'Repasar', status: 'pendiente', recurrence: 'diaria' },
      { title: 'Repasar', status: 'pendiente', recurrence: 'diaria', dueDate: due },
      'completada',
      'Estudio'
    );
    expect(text).toContain('al ser repetitiva sigue abierta');
    expect(text).toContain('2026-11-25');
  });

  test('says when nothing changed', () => {
    expect(
      summarizeMovedTask(
        { title: 'Leer', status: 'completada' },
        { title: 'Leer', status: 'completada' },
        'completada',
        'Estudio'
      )
    ).toContain('ya estaba completada');
  });
});

describe('project edits', () => {
  const base = { _id: 'p1', name: 'Viejo', description: 'Antes', status: 'activo' as const };

  test('lists name and description changes with the id', () => {
    const text = summarizeEditedProject(base, { ...base, name: 'Nuevo', description: undefined });
    expect(text).toContain('id p1');
    expect(text).toContain('nombre: «Viejo» → «Nuevo»');
    expect(text).toContain('descripción: «Antes» → (vacía)');
  });

  test('says when the edit changed nothing', () => {
    expect(summarizeEditedProject(base, base)).toContain('no cambió nada');
  });

  test('shows status before and after, defaulting a missing status to activo', () => {
    expect(
      summarizeProjectStatus({ _id: 'p1', name: 'X' }, { _id: 'p1', name: 'X', status: 'en_pausa' })
    ).toBe('Proyecto «X» (id p1): activo → en pausa.');
    expect(
      summarizeProjectStatus({ ...base, status: 'en_pausa' }, { ...base, status: 'en_pausa' })
    ).toContain('ya estaba en pausa');
  });
});

describe('task edits', () => {
  const nov23 = Date.UTC(2026, 10, 23, 5);
  const nov30 = Date.UTC(2026, 10, 30, 5);
  const base = {
    _id: 't1',
    title: 'n8n',
    status: 'pendiente' as const,
    dueDate: nov23,
    recurrence: 'laboral' as const,
  };
  const same = { before: 'Estudio', after: 'Estudio' };

  test('shows the date change in the requested format, and nothing else', () => {
    const text = summarizeEditedTask(base, { ...base, dueDate: nov30 }, same);
    expect(text).toContain('Tarea «n8n» (id t1) actualizada:');
    expect(text).toContain('- fecha: 2026-11-23 → 2026-11-30');
    expect(text.split('\n')).toHaveLength(2);
  });

  test('describes recurrence, deadline, hours, notes and project changes', () => {
    const text = summarizeEditedTask(
      { ...base, notes: 'antes' },
      {
        ...base,
        dueDate: undefined,
        noDeadline: true,
        recurrence: undefined,
        estimatedHours: 1.5,
        notes: undefined,
        priority: 'alta',
      },
      { before: 'A', after: 'B' }
    );
    expect(text).toContain('fecha: 2026-11-23 → sin fecha límite');
    expect(text).toContain('repetición: Lun a vie → sin repetición');
    expect(text).toContain('horas estimadas: sin estimar → 1.5 h');
    expect(text).toContain('notas: «antes» → (vacías)');
    expect(text).toContain('prioridad: sin prioridad → alta');
    expect(text).toContain('proyecto: «A» → «B»');
  });

  test('says when nothing changed', () => {
    expect(summarizeEditedTask(base, base, same)).toContain('no cambió nada');
  });
});
