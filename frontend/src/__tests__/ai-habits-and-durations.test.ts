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
import { TASK_QUALITY_RULES } from '@/shared/lib/ai/ai-gateway';

const habit = {
  title: 'Practicar 10 minutos de inglés',
  estimatedHours: 0.17,
  noDeadline: true,
  recurrence: 'diaria',
};
const filler = Array.from({ length: 3 }, (_, i) => ({ title: `Extra ${i}`, noDeadline: true }));

describe('durations from the AI', () => {
  it('keeps short durations instead of rounding them to half hours', () => {
    expect(normalizeAiHours(0.17)).toBe(0.17);
    expect(normalizeAiHours(10 / 60)).toBe(0.17);
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
    expect(parsed.tasks[0].estimatedHours).toBe(0.17);
    const args = draftToCreateArgs(projectToDraft(parsed));
    expect(args.tasks[0].estimatedHours).toBe(0.17);
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

describe('prompt rules for habits and durations', () => {
  it('ask for recurrence on daily/weekly habits', () => {
    expect(TASK_QUALITY_RULES).toContain('"recurrence": "diaria" o "semanal"');
  });

  it('ask to respect the duration given by the user', () => {
    expect(TASK_QUALITY_RULES).toContain('10 min = 0.17');
    expect(TASK_QUALITY_RULES).toMatch(/Nunca la redondees hacia arriba/);
  });
});
