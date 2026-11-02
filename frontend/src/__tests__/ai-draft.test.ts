import { describe, it, expect } from 'vitest';
import {
  draftToCreateArgs,
  extractExplicitTitle,
  isDraftDirty,
  newDraftTask,
  projectToDraft,
} from '@/domains/projects/lib/ai-draft';
import { AiProjectSchema } from '@/domains/projects/schemas/ai-project.schema';

describe('extractExplicitTitle', () => {
  it('uses the text before the first period as the title', () => {
    expect(extractExplicitTitle('Inglés B2. Retomo tras 19 días, 30 min al día')).toEqual({
      title: 'Inglés B2',
      rest: 'Retomo tras 19 días, 30 min al día',
    });
  });

  it('uses the text before a colon as the title', () => {
    expect(extractExplicitTitle('Campaña de lanzamiento: 3 semanas, presupuesto bajo')).toEqual({
      title: 'Campaña de lanzamiento',
      rest: '3 semanas, presupuesto bajo',
    });
  });

  it('keeps the title verbatim, including case', () => {
    expect(extractExplicitTitle('mi PROYECTO x. Hazlo')?.title).toBe('mi PROYECTO x');
  });

  it('returns null when there is no separator', () => {
    expect(extractExplicitTitle('Campaña de marketing en 3 semanas')).toBeNull();
  });

  it('ignores decimals and times that are not followed by a space', () => {
    expect(extractExplicitTitle('Entrenar 3.5 horas a las 10:30 cada día')).toBeNull();
  });

  it('returns null when nothing follows the title', () => {
    expect(extractExplicitTitle('Aprender inglés.')).toBeNull();
  });

  it('does not treat a long first sentence as a title', () => {
    const long = `${'Quiero aprender inglés para viajar '.repeat(3)}. Tengo 30 minutos`;
    expect(extractExplicitTitle(long)).toBeNull();
  });
});

describe('draft conversion', () => {
  const project = AiProjectSchema.parse({
    projectName: 'Nombre IA',
    description: 'Descripción corta.',
    tasks: [
      { title: 'A', priority: 'alta', estimatedHours: 1.5, dueDate: '2026-03-15' },
      { title: 'B', noDeadline: true },
      { title: 'C', noDeadline: true },
      { title: 'D', noDeadline: true },
    ],
  });

  it('keeps the name chosen by the user over the AI one', () => {
    expect(projectToDraft(project, 'Mi nombre').name).toBe('Mi nombre');
    expect(projectToDraft(project).name).toBe('Nombre IA');
  });

  it('converts the draft to mutation arguments', () => {
    const args = draftToCreateArgs(projectToDraft(project));
    expect(args.tasks[0]).toMatchObject({
      title: 'A',
      position: 0,
      priority: 'alta',
      estimatedHours: 1.5,
    });
    expect(typeof args.tasks[0].dueDate).toBe('number');
    expect(args.tasks[1]).toEqual({ title: 'B', position: 1, noDeadline: true });
  });

  it('drops empty tasks and renumbers positions after edits', () => {
    const draft = projectToDraft(project);
    draft.tasks[1].title = '   ';
    draft.tasks.push(newDraftTask({ title: 'Nueva', estimatedHours: '0,5' }));
    const args = draftToCreateArgs(draft);
    expect(args.tasks.map((t) => [t.title, t.position])).toEqual([
      ['A', 0],
      ['C', 1],
      ['D', 2],
      ['Nueva', 3],
    ]);
    expect(args.tasks[3].estimatedHours).toBe(0.5);
  });

  it('sends noDeadline only when the task has no date', () => {
    const draft = projectToDraft(project);
    expect(draft.tasks[1].noDeadline).toBe(true);

    draft.tasks[1].dueDate = '2030-03-15';
    const dated = draftToCreateArgs(draft).tasks[1];
    expect(typeof dated.dueDate).toBe('number');
    expect(dated).not.toHaveProperty('noDeadline');

    draft.tasks[0].noDeadline = true;
    draft.tasks[0].dueDate = '';
    expect(draftToCreateArgs(draft).tasks[0]).toMatchObject({ noDeadline: true });
    expect(draftToCreateArgs(draft).tasks[0]).not.toHaveProperty('dueDate');
  });

  it('ignores invalid hours and dates typed in the form', () => {
    const draft = projectToDraft(project);
    draft.tasks[0].estimatedHours = 'abc';
    draft.tasks[0].dueDate = '2026-02-31';
    const first = draftToCreateArgs(draft).tasks[0];
    expect(first).not.toHaveProperty('estimatedHours');
    expect(first).not.toHaveProperty('dueDate');
  });
});

describe('isDraftDirty', () => {
  const base = () =>
    projectToDraft(
      AiProjectSchema.parse({
        projectName: 'Proyecto',
        tasks: [{ title: 'A', noDeadline: true }],
      })
    );

  it('is false for the untouched draft, even with different React keys', () => {
    const initial = base();
    const copy = { ...initial, tasks: initial.tasks.map((t) => ({ ...t, key: `other-${t.key}` })) };
    expect(isDraftDirty(initial, copy)).toBe(false);
  });

  it('detects edits to name, description and any task field', () => {
    const initial = base();
    expect(isDraftDirty(initial, { ...initial, name: 'Otro' })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, description: 'Algo' })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, tasks: [{ ...initial.tasks[0], title: 'B' }] })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, tasks: [{ ...initial.tasks[0], estimatedHours: '10 min' }] })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, tasks: [...initial.tasks, newDraftTask()] })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, tasks: [] })).toBe(true);
  });

  it('is false again when an edit is undone', () => {
    const initial = base();
    expect(isDraftDirty(initial, { ...initial, name: 'x' })).toBe(true);
    expect(isDraftDirty(initial, { ...initial, name: initial.name })).toBe(false);
  });
});
