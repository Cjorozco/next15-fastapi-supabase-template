import type { z } from 'zod';
import { AISchemaValidationError } from './ai-errors';
import { executeAiPrompt, type ExecuteAiPromptParams } from './ai-gateway';
import { extractJsonFromAIResponse, safeParseAIResponse } from './safe-ai-parser';

const MAX_ATTEMPTS = 2;

interface ValidatedRequestParams<T extends z.ZodTypeAny> extends ExecuteAiPromptParams {
  schema: T;
  /** Adjusts the extracted JSON before validation (e.g. to force a user-chosen field). */
  prepare?: (extracted: unknown) => unknown;
}

function buildRetryPrompt(prompt: string, formattedError: string): string {
  return `${prompt}

Tu respuesta anterior no cumplió el formato requerido:
${formattedError}

Corrige esos errores y responde solo con el objeto JSON completo.`;
}

/**
 * Asks the model for JSON and validates it with `schema` (never `.parse()`).
 * If the output is invalid it retries once, feeding the exact validation issues back
 * to the model, and then throws `AISchemaValidationError`. Network, quota and timeout
 * errors from the provider are not retried here.
 */
export async function requestValidatedAiJson<T extends z.ZodTypeAny>(
  params: ValidatedRequestParams<T>
): Promise<z.output<T>> {
  const { schema, prepare, ...promptParams } = params;
  let prompt = promptParams.prompt;
  let lastFailure: { error: unknown; details: string } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const rawText = await executeAiPrompt({
      ...promptParams,
      prompt,
      responseFormat: 'json',
    });

    const extracted = extractJsonFromAIResponse(rawText);
    const parsed = safeParseAIResponse(schema, prepare ? prepare(extracted) : extracted);
    if (parsed.success) return parsed.data;

    lastFailure = { error: parsed.error, details: parsed.formattedError.replace(/\n/g, '; ') };
    prompt = buildRetryPrompt(promptParams.prompt, parsed.formattedError);
  }

  throw new AISchemaValidationError(lastFailure?.error, lastFailure?.details);
}
