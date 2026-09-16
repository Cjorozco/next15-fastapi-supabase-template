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

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.6-flash',
];

export class GeminiProviderClient implements AiProviderClient {
  readonly providerId = 'gemini' as const;
  private defaultApiKey?: string;
  private defaultModel: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.defaultApiKey = config?.apiKey;
    this.defaultModel = config?.model || DEFAULT_GEMINI_MODEL;
  }

  async generate(request: AiGenerateRequest, options?: AiRequestOptions): Promise<string> {
    const apiKey = options?.apiKey?.trim() || this.defaultApiKey?.trim() || getStoredApiKey('gemini');

    if (!apiKey) {
      throw new AIAuthenticationError(
        'API Key de Google Gemini no configurada. Por favor ingresa tu API Key en la configuración.'
      );
    }

    const primaryModel = request.model || this.defaultModel;
    const modelsToTry = request.model
      ? [request.model]
      : [primaryModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

    const timeoutMs = options?.timeoutMs ?? 8000;
    let lastErrorDetail = '';
    let lastStatus = 0;

    for (const currentModel of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [{ text: request.prompt.trim() }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      };

      if (request.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: request.systemInstruction }],
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Handle external signal if provided
      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

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

        lastErrorDetail = errorDetail;
        lastStatus = response.status;

        // Model not found or deprecated: try next model in fallback list
        if (
          response.status === 404 ||
          errorDetail.includes('not found') ||
          errorDetail.includes('no longer available')
        ) {
          continue;
        }

        // If thinkingConfig is not supported on this model (400), retry without thinkingConfig
        if (response.status === 400 && errorDetail.toLowerCase().includes('thinkingconfig')) {
          const retryBody = {
            ...requestBody,
            generationConfig: {
              temperature: request.temperature ?? 0.2,
              ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
            },
          };

          const retryController = new AbortController();
          const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);
          try {
            const retryRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(retryBody),
              signal: retryController.signal,
            });

            if (retryRes.ok) {
              const resJson = await retryRes.json();
              const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (typeof text === 'string') return text;
            }
          } catch {
            // fall through to standard error handling
          } finally {
            clearTimeout(retryTimer);
          }
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
            'La API Key de Gemini ingresada no es válida. Por favor verifica tu clave.',
            errorDetail
          );
        }

        if (response.status === 401 || response.status === 403) {
          throw new AIAuthenticationError(
            'Acceso no autorizado con la API Key de Gemini proporcionada.',
            errorDetail
          );
        }

        throw new AIException(
          'UNKNOWN',
          `Error del servicio Gemini (${response.status}): ${errorDetail}`,
          errorDetail
        );
      }

      let jsonResponse: unknown;
      try {
        jsonResponse = await response.json();
      } catch (parseError: unknown) {
        throw new AISchemaValidationError(parseError, 'Respuesta HTTP no es un JSON válido');
      }

      const rawText = (jsonResponse as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      })?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof rawText !== 'string') {
        throw new AISchemaValidationError(null, 'El modelo Gemini no retornó texto en la respuesta');
      }

      return rawText;
    }

    throw new AIException(
      'UNKNOWN',
      `Error del servicio Gemini (${lastStatus}): ${lastErrorDetail || 'Modelo no disponible'}`,
      lastErrorDetail
    );
  }
}
