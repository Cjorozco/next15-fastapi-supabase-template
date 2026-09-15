import { ZodError } from 'zod';

export type AIErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_SCHEMA'
  | 'INVALID_API_KEY'
  | 'EMPTY_RESPONSE'
  | 'UNKNOWN';

/**
 * Base typed exception class for all AI operations.
 */
export class AIException extends Error {
  readonly code: AIErrorCode;
  readonly userMessage: string;
  readonly originalError?: unknown;

  constructor(code: AIErrorCode, userMessage: string, originalError?: unknown) {
    super(userMessage);
    this.name = 'AIException';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

/**
 * Rate limit / Quota exceeded error (HTTP 429 or RESOURCE_EXHAUSTED).
 */
export class AIRateLimitError extends AIException {
  constructor(originalError?: unknown) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'La IA está saturada. Por favor, crea el proyecto manualmente por ahora.',
      originalError
    );
    this.name = 'AIRateLimitError';
  }
}

/**
 * Timeout error when LLM call exceeds the allowed threshold.
 */
export class AITimeoutError extends AIException {
  constructor(originalError?: unknown) {
    super(
      'TIMEOUT',
      'El servicio de IA tardó demasiado en responder. Por favor, intenta de nuevo o crea el proyecto manualmente.',
      originalError
    );
    this.name = 'AITimeoutError';
  }
}

/**
 * Network / Connectivity error when calling the LLM provider.
 */
export class AINetworkError extends AIException {
  constructor(originalError?: unknown) {
    super(
      'NETWORK_ERROR',
      'Error de conexión con el servicio de IA. Revisa tu conexión o crea el proyecto manualmente.',
      originalError
    );
    this.name = 'AINetworkError';
  }
}

/**
 * Schema validation error when LLM returns invalid JSON or hallucinates unexpected structure.
 */
export class AISchemaValidationError extends AIException {
  constructor(originalError?: unknown, details?: string) {
    const extra = details ? ` (${details})` : '';
    super(
      'INVALID_SCHEMA',
      `La IA generó una respuesta con formato inválido${extra}. Por favor, crea el proyecto manualmente por ahora.`,
      originalError
    );
    this.name = 'AISchemaValidationError';
  }
}

/**
 * Authentication / Key error when API key is missing or rejected.
 */
export class AIAuthenticationError extends AIException {
  constructor(message?: string, originalError?: unknown) {
    super(
      'INVALID_API_KEY',
      message || 'La API Key de Gemini no es válida. Por favor, actualiza tu clave o crea el proyecto manualmente.',
      originalError
    );
    this.name = 'AIAuthenticationError';
  }
}

/**
 * Utility to map any unknown caught error to a user-friendly UI message.
 */
export function mapAIErrorToUserMessage(error: unknown): {
  code: AIErrorCode;
  message: string;
} {
  if (error instanceof AIException) {
    return {
      code: error.code,
      message: error.userMessage,
    };
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((i) => i.message).join(', ');
    return {
      code: 'INVALID_SCHEMA',
      message: `La IA generó una estructura inválida (${details}). Por favor, crea el proyecto manualmente por ahora.`,
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('resource_exhausted')) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'La IA está saturada. Por favor, crea el proyecto manualmente por ahora.',
      };
    }
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('tardó')) {
      return {
        code: 'TIMEOUT',
        message: 'El servicio de IA tardó demasiado en responder. Por favor, intenta de nuevo o crea el proyecto manualmente.',
      };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('conexión') || msg.includes('failed to fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Error de conexión con el servicio de IA. Revisa tu conexión o crea el proyecto manualmente.',
      };
    }
    return {
      code: 'UNKNOWN',
      message: error.message || 'Ocurrió un error con el servicio de IA. Intenta crear el proyecto manualmente.',
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Ocurrió un error inesperado al procesar con IA. Por favor, crea el proyecto manualmente.',
  };
}
