import { AiProviderClient, AiGenerateRequest, AiRequestOptions } from '../types';
import { getStoredApiKey } from '../ai-storage';
import {
  AIRateLimitError,
  AITimeoutError,
  AINetworkError,
  AISchemaValidationError,
  AIAuthenticationError,
  AIException,
} from '../ai-errors';

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

export class GroqProviderClient implements AiProviderClient {
  readonly providerId = 'groq' as const;
  private defaultApiKey?: string;
  private defaultModel: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.defaultApiKey = config?.apiKey;
    this.defaultModel = config?.model || DEFAULT_GROQ_MODEL;
  }

  async generate(request: AiGenerateRequest, options?: AiRequestOptions): Promise<string> {
    const apiKey = options?.apiKey?.trim() || this.defaultApiKey?.trim() || getStoredApiKey('groq');

    if (!apiKey) {
      throw new AIAuthenticationError(
        'API Key de Groq no configurada. Por favor ingresa tu API Key en la configuración.'
      );
    }

    const primaryModel = request.model || this.defaultModel;
    const modelsToTry = request.model
      ? [request.model]
      : [primaryModel, ...GROQ_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

    const timeoutMs = options?.timeoutMs ?? 8000;
    let lastErrorDetail = '';
    let lastStatus = 0;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    messages.push({ role: 'user', content: request.prompt.trim() });

    for (const currentModel of modelsToTry) {
      const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

      const requestBody: Record<string, unknown> = {
        model: currentModel,
        messages,
        temperature: request.temperature ?? 0.2,
        ...(request.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
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

        lastErrorDetail = errorDetail;
        lastStatus = response.status;

        // Model not found / invalid model: try next model in fallback
        if (
          response.status === 404 ||
          (response.status === 400 && errorDetail.includes('model'))
        ) {
          continue;
        }

        if (
          response.status === 429 ||
          errorDetail.toLowerCase().includes('rate limit') ||
          errorDetail.toLowerCase().includes('quota')
        ) {
          throw new AIRateLimitError(errorDetail);
        }

        if (response.status === 401 || response.status === 403) {
          throw new AIAuthenticationError(
            'API Key de Groq inválida o no autorizada.',
            errorDetail
          );
        }

        throw new AIException(
          'UNKNOWN',
          `Error del servicio Groq (${response.status}): ${errorDetail}`,
          errorDetail
        );
      }

      let jsonResponse: unknown;
      try {
        jsonResponse = await response.json();
      } catch (parseError: unknown) {
        throw new AISchemaValidationError(parseError, 'Respuesta HTTP de Groq no es un JSON válido');
      }

      const rawText = (jsonResponse as {
        choices?: Array<{ message?: { content?: string } }>;
      })?.choices?.[0]?.message?.content;

      if (typeof rawText !== 'string') {
        throw new AISchemaValidationError(null, 'El modelo Groq no retornó texto en la respuesta');
      }

      return rawText;
    }

    throw new AIException(
      'UNKNOWN',
      `Error del servicio Groq (${lastStatus}): ${lastErrorDetail || 'Modelo no disponible'}`,
      lastErrorDetail
    );
  }
}
