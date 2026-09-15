import { AiProjectSchema, type AiProject } from '@/domains/projects/schemas/ai-project.schema';
import { extractJsonFromAIResponse } from '@/shared/lib/ai/safe-ai-parser';
import {
  AIRateLimitError,
  AITimeoutError,
  AINetworkError,
  AISchemaValidationError,
  AIAuthenticationError,
  AIException,
} from './ai-errors';
import { ZodError } from 'zod';

export const GEMINI_STORAGE_KEY = 'gemini_api_key';
export const AI_STORAGE_KEY = 'ai_api_key';

/**
 * Retrieves the stored BYOK API key from localStorage.
 */
export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(GEMINI_STORAGE_KEY) ||
    localStorage.getItem(AI_STORAGE_KEY) ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  );
}

/**
 * Stores the BYOK API key in localStorage.
 */
export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
    localStorage.setItem(AI_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
    localStorage.removeItem(AI_STORAGE_KEY);
  }
}

const SYSTEM_INSTRUCTION = `Eres un gestor de proyectos senior y experto en productividad.
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

/**
 * Client-Side LLM invocation using Bring-Your-Own-Key (BYOK).
 * Calls Gemini directly from the browser to keep the key within the client.
 * Strictly enforces AiProjectSchema.parse() validation on the response with typed error handling.
 */
export async function generateProjectWithAi(params: {
  prompt: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}): Promise<AiProject> {
  const apiKey = params.apiKey?.trim() || getStoredApiKey();

  if (!apiKey) {
    throw new AIAuthenticationError(
      'API Key no encontrada. Por favor proporciona tu API Key de Google Gemini para continuar.'
    );
  }

  const model = params.model || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: params.prompt.trim() }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const timeoutMs = params.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (networkError: unknown) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new AITimeoutError(networkError);
    }
    throw new AINetworkError(networkError);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson?.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }

    if (
      response.status === 429 ||
      errorDetail.includes('RESOURCE_EXHAUSTED') ||
      errorDetail.toLowerCase().includes('quota') ||
      errorDetail.toLowerCase().includes('rate limit')
    ) {
      throw new AIRateLimitError(errorDetail);
    }

    if (
      response.status === 400 &&
      (errorDetail.includes('API_KEY_INVALID') || errorDetail.toLowerCase().includes('api key'))
    ) {
      throw new AIAuthenticationError(
        'La API Key ingresada no es válida. Por favor verifica tu clave.',
        errorDetail
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AIAuthenticationError(
        'Acceso no autorizado con la API Key proporcionada.',
        errorDetail
      );
    }

    throw new AIException(
      'UNKNOWN',
      `Error del servicio de IA (${response.status}): ${errorDetail}`,
      errorDetail
    );
  }

  let jsonResponse: unknown;
  try {
    jsonResponse = await response.json();
  } catch (parseError: unknown) {
    throw new AISchemaValidationError(parseError, 'Respuesta HTTP no es un JSON válido');
  }

  const rawText = (jsonResponse as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || typeof rawText !== 'string') {
    throw new AISchemaValidationError(null, 'El modelo de IA no retornó texto en la respuesta');
  }

  // 1. Extraer y sanitizar estructura JSON de la respuesta
  let extracted: unknown;
  try {
    extracted = extractJsonFromAIResponse(rawText);
  } catch (extractError: unknown) {
    throw new AISchemaValidationError(extractError, 'No se pudo decodificar el formato JSON generado');
  }

  // 2. Validación OBLIGATORIA con AiProjectSchema.parse()
  try {
    const validatedProject: AiProject = AiProjectSchema.parse(extracted);
    return validatedProject;
  } catch (validationError: unknown) {
    if (validationError instanceof ZodError) {
      const details = validationError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new AISchemaValidationError(validationError, details);
    }
    throw new AISchemaValidationError(validationError);
  }
}

export * from './ai-errors';
