import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateProjectWithAi,
  getStoredApiKey,
  setStoredApiKey,
  GEMINI_STORAGE_KEY,
  AI_STORAGE_KEY,
  AIRateLimitError,
  AITimeoutError,
  AINetworkError,
  AISchemaValidationError,
  AIAuthenticationError,
  mapAIErrorToUserMessage,
} from '@/shared/lib/ai/gemini-client';

describe('Gemini Client (Client-Side BYOK, Typed Errors & Schema Validation)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('manages API key in localStorage correctly', () => {
    expect(getStoredApiKey()).toBe('');

    setStoredApiKey('test-api-key-123');
    expect(getStoredApiKey()).toBe('test-api-key-123');
    expect(localStorage.getItem(GEMINI_STORAGE_KEY)).toBe('test-api-key-123');
    expect(localStorage.getItem(AI_STORAGE_KEY)).toBe('test-api-key-123');

    setStoredApiKey('');
    expect(getStoredApiKey()).toBe('');
    expect(localStorage.getItem(GEMINI_STORAGE_KEY)).toBeNull();
  });

  it('throws AIAuthenticationError when no API key is provided and none in localStorage', async () => {
    await expect(
      generateProjectWithAi({ prompt: 'Campaña de marketing en 3 semanas' })
    ).rejects.toThrowError(AIAuthenticationError);
  });

  it('successfully calls Gemini API, parses and validates response with AiProjectSchema', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  projectName: 'Campaña de Marketing 3 Semanas',
                  description: 'Estrategia integral de marketing digital',
                  tasks: [
                    { title: 'Definir buyer persona', position: 0 },
                    { title: 'Crear copy y creatividades', position: 1 },
                    { title: 'Configurar anuncios Meta y Google', position: 2 },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await generateProjectWithAi({
      prompt: 'Campaña de marketing en 3 semanas',
      apiKey: 'valid-api-key',
    });

    expect(result.projectName).toBe('Campaña de Marketing 3 Semanas');
    expect(result.description).toBe('Estrategia integral de marketing digital');
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].title).toBe('Definir buyer persona');
    expect(result.tasks[0].position).toBe(0);
  });

  it('intercepts HTTP 429 / Quota Exceeded and throws AIRateLimitError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({
        error: { message: 'RESOURCE_EXHAUSTED: Quota exceeded for quota metric' },
      }),
    } as Response);

    await expect(
      generateProjectWithAi({
        prompt: 'Campaña de marketing',
        apiKey: 'valid-api-key',
      })
    ).rejects.toThrowError(AIRateLimitError);

    try {
      await generateProjectWithAi({
        prompt: 'Campaña de marketing',
        apiKey: 'valid-api-key',
      });
    } catch (err: unknown) {
      const { message } = mapAIErrorToUserMessage(err);
      expect(message).toBe('La IA está saturada. Por favor, crea el proyecto manualmente por ahora.');
    }
  });

  it('intercepts Network failures and throws AINetworkError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      generateProjectWithAi({
        prompt: 'Campaña de marketing',
        apiKey: 'valid-api-key',
      })
    ).rejects.toThrowError(AINetworkError);

    try {
      await generateProjectWithAi({
        prompt: 'Campaña de marketing',
        apiKey: 'valid-api-key',
      });
    } catch (err: unknown) {
      const { message } = mapAIErrorToUserMessage(err);
      expect(message).toContain('Error de conexión con el servicio de IA');
    }
  });

  it('intercepts Timeout and throws AITimeoutError', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });

    await expect(
      generateProjectWithAi({
        prompt: 'Campaña de marketing',
        apiKey: 'valid-api-key',
        timeoutMs: 10,
      })
    ).rejects.toThrowError(AITimeoutError);
  });

  it('throws AISchemaValidationError when LLM hallucinates or returns invalid schema/JSON', async () => {
    const invalidAiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  projectName: 'A', // invalid < 3 chars
                  tasks: [], // invalid < 1 task
                }),
              },
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => invalidAiResponse,
    } as Response);

    await expect(
      generateProjectWithAi({
        prompt: 'Proyecto inválido',
        apiKey: 'valid-key',
      })
    ).rejects.toThrowError(AISchemaValidationError);

    try {
      await generateProjectWithAi({
        prompt: 'Proyecto inválido',
        apiKey: 'valid-key',
      });
    } catch (err: unknown) {
      const { message } = mapAIErrorToUserMessage(err);
      expect(message).toContain('La IA generó una respuesta con formato inválido');
    }
  });
});
