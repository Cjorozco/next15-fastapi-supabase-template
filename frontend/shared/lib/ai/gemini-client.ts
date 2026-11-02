import { AiProjectSchema, type AiProject } from '@/domains/projects/schemas/ai-project.schema';
import { AIAuthenticationError } from './ai-errors';
import {
  GEMINI_STORAGE_KEY,
  AI_STORAGE_KEY,
  GROQ_STORAGE_KEY,
  getStoredApiKey,
  setStoredApiKey,
  getStoredProvider,
  setStoredProvider,
} from './ai-storage';
import { buildProjectSystemInstruction, DEFAULT_AI_TIMEOUT_MS } from './ai-gateway';
import { requestValidatedAiJson } from './validated-request';
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

/** Overwrites `projectName` in the model's JSON so a name chosen by the user is kept as is. */
function forceProjectName(fixedName: string) {
  return (extracted: unknown): unknown =>
    extracted && typeof extracted === 'object' && !Array.isArray(extracted)
      ? { ...extracted, projectName: fixedName }
      : extracted;
}

/**
 * Client-Side LLM invocation using Bring-Your-Own-Key (BYOK).
 * Powered by the Multi-Provider AI Gateway.
 * The response is validated with AiProjectSchema (safeParse); an invalid answer is
 * retried once with the validation issues and then reported as AISchemaValidationError.
 *
 * @param params.fixedName - Name written by the user: it is sent to the model as
 *   context but always wins over whatever the model returns.
 */
export async function generateProjectWithAi(params: {
  prompt: string;
  apiKey?: string;
  provider?: AiProviderId;
  model?: string;
  timeoutMs?: number;
  fixedName?: string;
  today?: Date;
}): Promise<AiProject> {
  const provider = params.provider || getStoredProvider();
  const apiKey = params.apiKey?.trim() || getStoredApiKey(provider);

  if (!apiKey) {
    throw new AIAuthenticationError(
      'API Key no encontrada. Por favor proporciona tu API Key de Google Gemini para continuar.'
    );
  }

  const fixedName = params.fixedName?.trim();
  const prompt = fixedName
    ? `Nombre del proyecto (fijo, no lo cambies): ${fixedName}\n\n${params.prompt}`
    : params.prompt;

  return requestValidatedAiJson({
    schema: AiProjectSchema,
    prompt,
    systemInstruction: buildProjectSystemInstruction(params.today ?? new Date()),
    provider,
    apiKey,
    model: params.model,
    timeoutMs: params.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
    prepare: fixedName ? forceProjectName(fixedName) : undefined,
  });
}

export * from './ai-errors';
