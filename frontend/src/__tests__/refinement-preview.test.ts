import { describe, it, expect } from 'vitest';
import { buildRefinementPreview, toApplyPayload } from '@/domains/projects/lib/refinement-preview';
import type { AiRefinement } from '@/domains/projects/schemas/ai-refine.schema';

const project = {
  description: 'Actual',
  tasks: [{ _id: 't1', title: 'Tarea uno' }],
};

const refinement = (overrides: Partial<AiRefinement>): AiRefinement => ({
  summary: 'Resumen',
  newTasks: [],
  newSubtasksForExistingTasks: [],
  ...overrides,
});

describe('buildRefinementPreview', () => {
  it('resolves existing task titles and skips unknown task ids', () => {
    const preview = buildRefinementPreview(
      refinement({
        newSubtasksForExistingTasks: [
          { taskId: 't1', subtaskTitles: ['A'] },
          { taskId: 'ghost', subtaskTitles: ['B'] },
        ],
      }),
      project
    );

    expect(preview.existingTaskSubtasks).toEqual([
      { taskId: 't1', taskTitle: 'Tarea uno', subtaskTitles: ['A'] },
    ]);
    expect(preview.skippedCount).toBe(1);
    expect(toApplyPayload(preview).newSubtasksForExistingTasks).toEqual([
      { taskId: 't1', subtaskTitles: ['A'] },
    ]);
  });

  it('treats an empty or identical description as no change', () => {
    expect(buildRefinementPreview(refinement({ updatedDescription: '' }), project).description).toBeNull();
    expect(buildRefinementPreview(refinement({ updatedDescription: ' Actual ' }), project).description).toBeNull();
    expect(buildRefinementPreview(refinement({}), project).hasChanges).toBe(false);
  });

  it('reports the description before/after when it changes', () => {
    const preview = buildRefinementPreview(refinement({ updatedDescription: 'Nueva' }), project);
    expect(preview.description).toEqual({ before: 'Actual', after: 'Nueva' });
    expect(toApplyPayload(preview).updatedDescription).toBe('Nueva');
  });
});
