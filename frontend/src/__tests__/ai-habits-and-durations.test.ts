import { describe, it, expect } from 'vitest';
import { AiProjectSchema } from '@/domains/projects/schemas/ai-project.schema';
import { AiRefinementSchema } from '@/domains/projects/schemas/ai-refine.schema';
import {
  normalizeAiHours,
  normalizeAiRecurrence,
} from '@/domains/projects/schemas/ai-fields';
import {
  draftToCreateArgs,
  newDraftTask,
  projectToDraft,
} from '@/domains/projects/lib/ai-draft';
import { formatHours } from '@/domains/tasks/lib/dates';
import { buildProjectSystemInstruction, TASK_QUALITY_RULES } from '@/shared/lib/ai/ai-gateway';

const habit = {
  title: 'Practicar 10 minutos de inglés',
  estimatedHours: 0.17,
  noDeadline: true,
  recurrence: 'diaria',
};
const filler = Array.from({ length: 3 }, (_, i) => ({ title: `Extra ${i}`, noDeadline: true }));

describe('durations from the AI', () => {
  it('keeps short durations instead of rounding them to half hours', () => {
    expect(normalizeAiHours(0.17)).toBe(0.1667); // 10 min
    expect(normalizeAiHours(10 / 60)).toBe(0.1667);
    expect(normalizeAiHours(0.08)).toBe(0.0833); // 5 min
    expect(normalizeAiHours('0.25')).toBe(0.25);
    expect(normalizeAiHours(0.5)).toBe(0.5);
    expect(normalizeAiHours(1.5)).toBe(1.5);
  });

  it('still drops invalid or non-positive values and caps the maximum', () => {
    expect(normalizeAiHours(0)).toBeUndefined();
    expect(normalizeAiHours(-1)).toBeUndefined();
    expect(normalizeAiHours('abc')).toBeUndefined();
    expect(normalizeAiHours(100)).toBe(40);
  });

  it('shows minutes under an hour and hours from one hour', () => {
    expect(formatHours(0.17)).toBe('10 min');
    expect(formatHours(0.25)).toBe('15 min');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(1)).toBe('1 h');
    expect(formatHours(1.5)).toBe('1.5 h');
    expect(formatHours(6)).toBe('6 h');
  });

  it('survives the whole draft round trip', () => {
    const parsed = AiProjectSchema.parse({ projectName: 'Inglés', tasks: [habit, ...filler] });
    expect(parsed.tasks[0].estimatedHours).toBe(0.1667);
    const draft = projectToDraft(parsed);
    expect(draft.tasks[0].estimatedHours).toBe('10 min');
    expect(draftToCreateArgs(draft).tasks[0].estimatedHours).toBe(0.1667);
  });
});

describe('recurrence from the AI', () => {
  it('maps aliases and drops unknown values', () => {
    expect(normalizeAiRecurrence('diaria')).toBe('diaria');
    expect(normalizeAiRecurrence('Daily')).toBe('diaria');
    expect(normalizeAiRecurrence('semanal')).toBe('semanal');
    expect(normalizeAiRecurrence('weekly')).toBe('semanal');
    expect(normalizeAiRecurrence('mensual')).toBeUndefined();
    expect(normalizeAiRecurrence(null)).toBeUndefined();
  });

  it('a daily habit keeps recurrence together with noDeadline', () => {
    const parsed = AiProjectSchema.parse({ projectName: 'Inglés', tasks: [habit, ...filler] });
    expect(parsed.tasks[0]).toMatchObject({ noDeadline: true, recurrence: 'diaria' });
    expect(parsed.tasks[1].recurrence).toBeUndefined();
  });

  it('is also accepted when refining a project', () => {
    const parsed = AiRefinementSchema.parse({
      newTasks: [{ title: 'Repaso semanal', noDeadline: true, recurrence: 'semanal' }],
    });
    expect(parsed.newTasks[0].recurrence).toBe('semanal');
  });

  it('flows from the draft to the creation arguments and can be edited', () => {
    const parsed = AiProjectSchema.parse({ projectName: 'Inglés', tasks: [habit, ...filler] });
    const draft = projectToDraft(parsed);
    expect(draft.tasks[0].recurrence).toBe('diaria');
    expect(draftToCreateArgs(draft).tasks[0]).toMatchObject({ noDeadline: true, recurrence: 'diaria' });

    draft.tasks[0].recurrence = '';
    expect(draftToCreateArgs(draft).tasks[0]).not.toHaveProperty('recurrence');
    draft.tasks.push(newDraftTask({ title: 'Semanal', recurrence: 'semanal', noDeadline: true }));
    expect(draftToCreateArgs(draft).tasks.at(-1)).toMatchObject({ recurrence: 'semanal' });
  });
});

describe('a single habit with rotating content', () => {
  it('flows from the AI response to the creation arguments', () => {
    const parsed = AiProjectSchema.parse({
      projectName: 'Inglés diario',
      tasks: [
        {
          title: 'Practicar inglés',
          estimatedHours: 10 / 60,
          noDeadline: true,
          recurrence: 'diaria',
          subtasks: ['Vocabulario', 'Pronunciación'],
          notes: 'Rota el foco',
        },
      ],
    });
    const args = draftToCreateArgs(projectToDraft(parsed));
    expect(args.tasks).toEqual([
      {
        title: 'Practicar inglés',
        position: 0,
        estimatedHours: 0.1667,
        noDeadline: true,
        recurrence: 'diaria',
        subtasks: ['Vocabulario', 'Pronunciación'],
        notes: 'Rota el foco',
      },
    ]);
  });

  it('lets the user edit the duration in minutes and the subtasks line by line', () => {
    const parsed = AiProjectSchema.parse({
      projectName: 'Inglés diario',
      tasks: [{ title: 'Practicar', estimatedHours: 0.17, noDeadline: true, subtasks: ['A'] }],
    });
    const draft = projectToDraft(parsed);
    draft.tasks[0].estimatedHours = '15 min';
    draft.tasks[0].subtasks = 'Uno\n\n  Dos  \n';
    draft.tasks[0].notes = '  ';
    const [task] = draftToCreateArgs(draft).tasks;
    expect(task.estimatedHours).toBe(0.25);
    expect(task.subtasks).toEqual(['Uno', 'Dos']);
    expect(task).not.toHaveProperty('notes');
  });
});

describe('prompt rules for habits and durations', () => {
  it('cap the recurring time by the total the user gave and ask for a single habit task', () => {
    expect(TASK_QUALITY_RULES).toContain('TIEMPO TOTAL');
    expect(TASK_QUALITY_RULES).toMatch(/NO puede superarlo/);
    expect(TASK_QUALITY_RULES).toMatch(/UNA sola tarea recurrente/);
    expect(TASK_QUALITY_RULES).toContain('"subtasks"');
  });

  it('allow a single task in the project instruction', () => {
    expect(buildProjectSystemInstruction()).toMatch(/entre 1 y 8 tareas/);
  });

  it('ask for recurrence on daily, Monday to Friday and weekly habits', () => {
    expect(TASK_QUALITY_RULES).toContain('"diaria" si es cada día');
    expect(TASK_QUALITY_RULES).toContain('"laboral" si es solo de lunes a viernes');
    expect(TASK_QUALITY_RULES).toContain('"semanal" si es cada semana');
  });

  it('ask to respect the duration given by the user', () => {
    expect(TASK_QUALITY_RULES).toContain('10 min = 0.17');
    expect(TASK_QUALITY_RULES).toMatch(/Nunca la redondees hacia arriba/);
  });
});
