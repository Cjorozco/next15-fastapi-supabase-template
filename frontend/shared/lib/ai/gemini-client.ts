import { AiProjectSchema, type AiProject } from '@/domains/projects/schemas/ai-project.schema';
import { extractJsonFromAIResponse } from '@/shared/lib/ai/safe-ai-parser';
import {
  AISchemaValidationError,
  AIAuthenticationError,
} from './ai-errors';
import { ZodError } from 'zod';
import {
  GEMINI_STORAGE_KEY,
  AI_STORAGE_KEY,
  GROQ_STORAGE_KEY,
  getStoredApiKey,
  setStoredApiKey,
  getStoredProvider,
  setStoredProvider,
} from './ai-storage';
import { executeAiPrompt, UNIFIED_SYSTEM_INSTRUCTION } from './ai-gateway';
import { DEFAULT_GEMINI_MODEL, GEMINI_FALLBACK_MODELS } from './adapters/gemini-adapter';
import { AiProviderId } from './types';

export {
  GEMINI_STORAGE_KEY,
  AI_STORAGE_KEY,
  GROQ_STORAGE_KEY,
  getStoredApiKey,
  setStoredApiKey,
  getStoredProvider,
  setStoredProvider,
};

export const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;
export const FALLBACK_MODELS = GEMINI_FALLBACK_MODELS;

/**
 * Client-Side LLM invocation using Bring-Your-Own-Key (BYOK).
 * Powered by the Multi-Provider AI Gateway.
 * Strictly enforces AiProjectSchema.parse() validation on the response with typed error handling.
 */
export async function generateProjectWithAi(params: {
  prompt: string;
  apiKey?: string;
  provider?: AiProviderId;
  model?: string;
  timeoutMs?: number;
}): Promise<AiProject> {
  const provider = params.provider || getStoredProvider();
  const apiKey = params.apiKey?.trim() || getStoredApiKey(provider);

  if (!apiKey) {
    throw new AIAuthenticationError(
      'API Key no encontrada. Por favor proporciona tu API Key de Google Gemini para continuar.'
    );
  }

  // 1. Invocar el orquestador Gateway (con timeout de 8s por defecto y thinkingBudget: 0)
  const rawText = await executeAiPrompt({
    prompt: params.prompt,
    systemInstruction: UNIFIED_SYSTEM_INSTRUCTION,
    provider,
    apiKey,
    model: params.model,
    timeoutMs: params.timeoutMs ?? 8000,
    responseFormat: 'json',
  });

  // 2. Extraer y sanitizar estructura JSON de la respuesta
  let extracted: unknown;
  try {
    extracted = extractJsonFromAIResponse(rawText);
  } catch (extractError: unknown) {
    throw new AISchemaValidationError(extractError, 'No se pudo decodificar el formato JSON generado');
  }

  // 3. Validación OBLIGATORIA con AiProjectSchema.parse()
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
