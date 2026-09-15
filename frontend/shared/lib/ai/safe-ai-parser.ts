import { z } from "zod";

export type AISuccessResult<T> = {
  success: true;
  data: T;
  raw: unknown;
};

export type AIFailureResult = {
  success: false;
  error: z.ZodError;
  issues: z.ZodIssue[];
  formattedError: string;
  raw: unknown;
};

export type AISafeResult<T> = AISuccessResult<T> | AIFailureResult;

/**
 * Extracts and sanitizes JSON from raw LLM output.
 * Strips markdown code blocks (e.g. ```json ... ```) and removes leading/trailing conversational text.
 */
export function extractJsonFromAIResponse(rawResponse: unknown): unknown {
  if (typeof rawResponse !== "string") {
    return rawResponse;
  }

  const trimmed = rawResponse.trim();

  // Case 1: Markdown fenced code block (```json ... ``` or ``` ... ```)
  const markdownBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownBlockMatch && markdownBlockMatch[1]) {
    try {
      return JSON.parse(markdownBlockMatch[1].trim());
    } catch {
      // If parsing the inside of code block fails, continue with further heuristics
    }
  }

  // Case 2: Raw JSON string directly
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue heuristics
  }

  // Case 3: JSON embedded inside conversational text (find outermost { ... } or [ ... ])
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Ignore and fallback
    }
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = trimmed.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Ignore and fallback
    }
  }

  // Return original if no valid JSON structure could be extracted
  return rawResponse;
}

/**
 * Formats Zod validation issues into an actionable instruction message
 * that can be fed back to an LLM in a self-correction/repair loop.
 */
export function formatZodIssuesForPrompt(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "root";
      return `- Field "${path}": ${issue.message} (code: ${issue.code})`;
    })
    .join("\n");
}

/**
 * Intercepts, extracts, and validates an AI response against a Zod schema.
 * Guarantees that invalid AI responses are caught safely without throwing unhandled exceptions,
 * preventing database corruption and UI render crashes.
 *
 * @param schema - The Zod schema defining the expected contract
 * @param rawResponse - The raw output from the AI model (string or pre-parsed object)
 */
export function safeParseAIResponse<T extends z.ZodTypeAny>(
  schema: T,
  rawResponse: unknown
): AISafeResult<z.infer<T>> {
  const sanitized = extractJsonFromAIResponse(rawResponse);

  const parseResult = schema.safeParse(sanitized);

  if (parseResult.success) {
    return {
      success: true,
      data: parseResult.data,
      raw: rawResponse,
    };
  }

  return {
    success: false,
    error: parseResult.error,
    issues: parseResult.error.issues,
    formattedError: formatZodIssuesForPrompt(parseResult.error),
    raw: rawResponse,
  };
}

/**
 * Validates AI output and returns a guaranteed fallback value if validation fails.
 * Ideal for non-critical UI features where graceful degradation is preferred.
 *
 * @param schema - The Zod schema
 * @param rawResponse - The raw AI output
 * @param fallback - The fallback value matching the schema type
 */
export function parseAIWithFallback<T extends z.ZodTypeAny>(
  schema: T,
  rawResponse: unknown,
  fallback: z.infer<T>
): { data: z.infer<T>; isFallback: boolean; error?: z.ZodError } {
  const result = safeParseAIResponse(schema, rawResponse);

  if (result.success) {
    return {
      data: result.data,
      isFallback: false,
    };
  }

  return {
    data: fallback,
    isFallback: true,
    error: result.error,
  };
}
