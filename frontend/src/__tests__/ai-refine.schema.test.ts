import { describe, it, expect } from 'vitest';
import { validateAiRefinementResponse } from '@/domains/projects/schemas/ai-refine.schema';

describe('AiRefinementSchema & Validation (Surgical AI Copilot)', () => {
  it('validates a complete refinement response', () => {
    const rawPayload = {
      summary: 'Se añadieron tareas de QA y subtareas técnicas.',
      updatedDescription: 'Plataforma SaaS con arquitectura serverless y pruebas de carga.',
      newTasks: [
        {
          title: 'Configurar suite de pruebas E2E',
          subtasks: ['Instalar Cypress', 'Configurar CI GitHub Actions'],
        },
      ],
      newSubtasksForExistingTasks: [
        {
          taskId: 'task_123',
          subtaskTitles: ['Migración de esquema', 'Crear índices'],
        },
      ],
    };

    const result = validateAiRefinementResponse(rawPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('Se añadieron tareas de QA y subtareas técnicas.');
      expect(result.data.updatedDescription).toBe('Plataforma SaaS con arquitectura serverless y pruebas de carga.');
      expect(result.data.newTasks).toHaveLength(1);
      expect(result.data.newTasks[0].subtasks).toHaveLength(2);
      expect(result.data.newSubtasksForExistingTasks).toHaveLength(1);
      expect(result.data.newSubtasksForExistingTasks[0].taskId).toBe('task_123');
    }
  });

  it('handles optional fields and sets defaults safely', () => {
    const minimalPayload = {};
    const result = validateAiRefinementResponse(minimalPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('Proyecto actualizado con éxito.');
      expect(result.data.updatedDescription).toBeUndefined();
      expect(result.data.newTasks).toEqual([]);
      expect(result.data.newSubtasksForExistingTasks).toEqual([]);
    }
  });

  it('strips markdown code blocks (```json ... ```) automatically', () => {
    const markdownWrapped = `\`\`\`json
{
  "summary": "Se actualizó la descripción.",
  "updatedDescription": "Nueva descripción mejorada",
  "newTasks": [],
  "newSubtasksForExistingTasks": []
}
\`\`\``;

    const result = validateAiRefinementResponse(markdownWrapped);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe('Se actualizó la descripción.');
      expect(result.data.updatedDescription).toBe('Nueva descripción mejorada');
    }
  });

  it('rejects invalid task titles in newTasks', () => {
    const invalidPayload = {
      newTasks: [
        {
          title: '', // empty title
        },
      ],
    };

    const result = validateAiRefinementResponse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.formattedError).toContain('El título de la tarea no puede estar vacío');
    }
  });
});
