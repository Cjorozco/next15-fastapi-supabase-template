import { z } from "zod";
import { safeParseAIResponse, AISafeResult } from "@/shared/lib/ai/safe-ai-parser";

/**
 * Task specification for new tasks to be appended by the refinement AI.
 */
export const AiNewTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título de la tarea no puede estar vacío")
    .max(200, "El título de la tarea no puede exceder 200 caracteres"),
  subtasks: z
    .array(
      z
        .string()
        .trim()
        .min(1, "El título de la subtarea no puede estar vacío")
        .max(200, "El título de la subtarea no puede exceder 200 caracteres")
    )
    .default([]),
});

/**
 * Injection specification for adding new subtasks to an existing task by its taskId.
 */
export const AiExistingTaskSubtasksSchema = z.object({
  taskId: z.string().trim().min(1, "El taskId es requerido"),
  subtaskTitles: z
    .array(
      z
        .string()
        .trim()
        .min(1, "El título de la subtarea no puede estar vacío")
        .max(200, "El título de la subtarea no puede exceder 200 caracteres")
    )
    .min(1, "Debe incluir al menos 1 subtarea para agregar a la tarea existente"),
});

/**
 * Strict schema for surgical AI project refinement.
 * Guarantees non-destructive updates and clean typed data for Convex mutation.
 */
export const AiRefinementSchema = z.object({
  summary: z
    .string()
    .trim()
    .max(300, "El resumen no puede exceder 300 caracteres")
    .default("Proyecto actualizado con éxito."),
  updatedDescription: z
    .string()
    .trim()
    .max(1000, "La descripción no puede exceder 1000 caracteres")
    .optional(),
  newTasks: z.array(AiNewTaskSchema).default([]),
  newSubtasksForExistingTasks: z.array(AiExistingTaskSubtasksSchema).default([]),
});

export type AiNewTask = z.infer<typeof AiNewTaskSchema>;
export type AiExistingTaskSubtasks = z.infer<typeof AiExistingTaskSubtasksSchema>;
export type AiRefinement = z.infer<typeof AiRefinementSchema>;

/**
 * Validates raw AI output against AiRefinementSchema.
 */
export function validateAiRefinementResponse(rawResponse: unknown): AISafeResult<AiRefinement> {
  return safeParseAIResponse(AiRefinementSchema, rawResponse);
}
