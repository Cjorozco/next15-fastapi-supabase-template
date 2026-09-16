import { AiProviderId } from './types';
import { createAiProviderClient } from './ai-factory';
import { getStoredProvider, getStoredApiKey } from './ai-storage';

export const UNIFIED_SYSTEM_INSTRUCTION = `Eres un gestor de proyectos senior y experto en productividad.
Tu objetivo es descomponer la idea o meta del usuario en un proyecto estructurado y accionable con tareas claras y secuenciales (entre 3 y 8 tareas).
Cada tarea debe tener un título conciso y un número de posición entero comenzando desde 0.

DEBES responder OBLIGATORIAMENTE con un objeto JSON válido que cumpla exactamente la siguiente estructura:
{
  "projectName": "Nombre conciso y profesional del proyecto (3 a 100 caracteres)",
  "description": "Breve descripción de los objetivos y alcance (máximo 1000 caracteres)",
  "tasks": [
    {
      "title": "Nombre de la tarea accionable",
      "position": 0
    }
  ]
}

No incluyas explicaciones adicionales ni texto fuera del objeto JSON.`;

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
 * 3. Enforces 8-second timeout via AbortController.
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
  const timeoutMs = params.timeoutMs ?? 8000;

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
