import { AiProviderId } from './types';
import { createAiProviderClient } from './ai-factory';
import { getStoredProvider, getStoredApiKey } from './ai-storage';

export const DEFAULT_AI_TIMEOUT_MS = 20000;

/** Rules shared by "Generar con IA" and "Refinar con IA" for the tasks the model proposes. */
export const TASK_QUALITY_RULES = `REGLAS PARA LAS TAREAS:
- Cada tarea es una acción concreta que se completa en UNA sola sesión de trabajo (verbo + objeto). Ejemplos buenos: "Resolver 10 ejercicios de pasado simple", "Escribir el borrador del correo de lanzamiento".
- PROHIBIDO generar tareas de planificación genérica ("evaluar nivel", "crear calendario", "seleccionar recursos", "definir objetivos", "investigar opciones") salvo que el usuario las pida de forma explícita.
- Usa las restricciones del usuario: tiempo diario disponible (ajusta las horas estimadas a ese tiempo), plazos y situación actual. Si dice que retoma algo tras un tiempo sin practicar, la primera tarea debe ser de reenganche (una sesión corta y fácil para retomar el hábito).
- "priority" es "alta", "media" o "baja": alta para lo que desbloquea el resto o es urgente por plazo.
- "estimatedHours" es un número de horas (0.5 a 8) realista para esa tarea.
- "dueDate" es "YYYY-MM-DD" SOLO si el usuario menciona un plazo (calcúlala desde la fecha de hoy); si no hay plazo, omite el campo.`;

export function formatPromptDate(today: Date): string {
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export function buildProjectSystemInstruction(today?: Date): string {
  const todayLine = today ? `Fecha de hoy: ${formatPromptDate(today)}.\n` : '';
  return `Eres un gestor de proyectos senior. Conviertes la idea o meta del usuario en un proyecto con tareas accionables.
${todayLine}
Entrega entre 4 y 8 tareas, en el orden en que conviene hacerlas. La descripción tiene como MÁXIMO 2 frases cortas y NO repite el texto del usuario: explica el objetivo y el alcance con otras palabras.

${TASK_QUALITY_RULES}

DEBES responder OBLIGATORIAMENTE con un objeto JSON válido con esta estructura:
{
  "projectName": "Nombre conciso del proyecto (3 a 100 caracteres)",
  "description": "Máximo 2 frases",
  "tasks": [
    { "title": "Acción concreta", "priority": "alta", "estimatedHours": 1.5, "dueDate": "2026-03-15" }
  ]
}

No incluyas explicaciones ni texto fuera del objeto JSON.`;
}

export const UNIFIED_SYSTEM_INSTRUCTION = buildProjectSystemInstruction();

export interface ExecuteAiPromptParams {
  prompt: string;
  systemInstruction?: string;
  provider?: AiProviderId;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  responseFormat?: 'json' | 'text';
  temperature?: number;
}

/**
 * AI Gateway Orchestrator:
 * 1. Resolves provider and API key (from parameters or localStorage).
 * 2. Injects unified system prompt.
 * 3. Enforces a 20-second timeout via AbortController.
 * 4. Invokes the selected provider client (with low latency / thinkingBudget: 0).
 * 5. Returns raw plain text ready for defensive Zod validation.
 */
export async function executeAiPrompt(params: ExecuteAiPromptParams): Promise<string> {
  const provider = params.provider || getStoredProvider();
  const apiKey = params.apiKey?.trim() || getStoredApiKey(provider);

  const client = createAiProviderClient(provider, {
    apiKey,
    model: params.model,
  });

  const systemInstruction = params.systemInstruction ?? UNIFIED_SYSTEM_INSTRUCTION;
  const timeoutMs = params.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;

  const rawText = await client.generate(
    {
      prompt: params.prompt,
      systemInstruction,
      temperature: params.temperature ?? 0.2,
      responseFormat: params.responseFormat ?? 'json',
      model: params.model,
    },
    {
      apiKey,
      timeoutMs,
    }
  );

  return rawText;
}
