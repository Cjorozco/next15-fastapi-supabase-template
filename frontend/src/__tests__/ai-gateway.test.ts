import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAiProviderClient,
  GeminiProviderClient,
  GroqProviderClient,
  executeAiPrompt,
  getStoredProvider,
  setStoredProvider,
  getStoredApiKey,
  setStoredApiKey,
  AIRateLimitError,
  AITimeoutError,
  AIAuthenticationError,
} from '@/shared/lib/ai';

interface GeminiRequestBody {
  generationConfig: {
    thinkingConfig: {
      thinkingBudget: number;
    };
    responseMimeType?: string;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GroqRequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: string };
}

describe('Multi-Provider AI Gateway & Adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Storage & Configuration', () => {
    it('handles provider selection and provider-specific keys in localStorage', () => {
      expect(getStoredProvider()).toBe('gemini');

      setStoredProvider('groq');
      expect(getStoredProvider()).toBe('groq');

      setStoredApiKey('gemini-secret-123', 'gemini');
      setStoredApiKey('groq-secret-456', 'groq');

      expect(getStoredApiKey('gemini')).toBe('gemini-secret-123');
      expect(getStoredApiKey('groq')).toBe('groq-secret-456');

      // Default retrieves key for active provider
      expect(getStoredApiKey()).toBe('groq-secret-456');
    });
  });

  describe('Factory Pattern (createAiProviderClient)', () => {
    it('creates GeminiProviderClient for "gemini"', () => {
      const client = createAiProviderClient('gemini');
      expect(client).toBeInstanceOf(GeminiProviderClient);
      expect(client.providerId).toBe('gemini');
    });

    it('creates GroqProviderClient for "groq"', () => {
      const client = createAiProviderClient('groq');
      expect(client).toBeInstanceOf(GroqProviderClient);
      expect(client.providerId).toBe('groq');
    });
  });

  describe('Gemini Adapter (REST, thinkingBudget: 0, 8s timeout)', () => {
    it('successfully calls Gemini REST endpoint with thinkingBudget: 0 and json config', async () => {
      let capturedBody: GeminiRequestBody | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedBody = JSON.parse(options.body) as GeminiRequestBody;
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"projectName": "Test Project", "tasks": []}' }],
                },
              },
            ],
          }),
        } as Response;
      });

      const client = new GeminiProviderClient({ apiKey: 'gemini-key' });
      const result = await client.generate({
        prompt: 'Build SaaS',
        systemInstruction: 'Be helpful',
        responseFormat: 'json',
      });

      expect(result).toBe('{"projectName": "Test Project", "tasks": []}');
      expect(capturedBody?.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
      expect(capturedBody?.generationConfig.responseMimeType).toBe('application/json');
      expect(capturedBody?.systemInstruction?.parts[0].text).toBe('Be helpful');
    });

    it('aborts on timeout (8s default)', async () => {
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      });

      const client = new GeminiProviderClient({ apiKey: 'gemini-key' });
      await expect(
        client.generate({ prompt: 'Build SaaS' }, { timeoutMs: 15 })
      ).rejects.toThrowError(AITimeoutError);
    });

    it('maps 429 quota error to AIRateLimitError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'RESOURCE_EXHAUSTED' } }),
      } as Response);

      const client = new GeminiProviderClient({ apiKey: 'gemini-key' });
      await expect(
        client.generate({ prompt: 'Build SaaS' })
      ).rejects.toThrowError(AIRateLimitError);
    });

    it('maps 400 invalid api key to AIAuthenticationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'API_KEY_INVALID' } }),
      } as Response);

      const client = new GeminiProviderClient({ apiKey: 'gemini-key' });
      await expect(
        client.generate({ prompt: 'Build SaaS' })
      ).rejects.toThrowError(AIAuthenticationError);
    });
  });

  describe('Groq Adapter (REST, Bearer Auth, OpenAI-compatible)', () => {
    it('successfully calls Groq completions endpoint with json_object format', async () => {
      let capturedHeaders: Record<string, string> | undefined;
      let capturedBody: GroqRequestBody | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedHeaders = options.headers as Record<string, string>;
        capturedBody = JSON.parse(options.body) as GroqRequestBody;
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '{"projectName": "Groq Project", "tasks": []}',
                },
              },
            ],
          }),
        } as Response;
      });

      const client = new GroqProviderClient({ apiKey: 'gsk_test_123' });
      const result = await client.generate({
        prompt: 'Build SaaS with Groq',
        systemInstruction: 'You are an architect',
        responseFormat: 'json',
      });

      expect(result).toBe('{"projectName": "Groq Project", "tasks": []}');
      expect(capturedHeaders?.Authorization).toBe('Bearer gsk_test_123');
      expect(capturedBody?.response_format).toEqual({ type: 'json_object' });
      expect(capturedBody?.messages[0]).toEqual({
        role: 'system',
        content: 'You are an architect',
      });
      expect(capturedBody?.messages[1]).toEqual({
        role: 'user',
        content: 'Build SaaS with Groq',
      });
    });

    it('maps 401 unauthorized to AIAuthenticationError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API Key' } }),
      } as Response);

      const client = new GroqProviderClient({ apiKey: 'bad-key' });
      await expect(
        client.generate({ prompt: 'Build SaaS' })
      ).rejects.toThrowError(AIAuthenticationError);
    });
  });

  describe('AI Gateway Orchestrator (executeAiPrompt)', () => {
    it('orchestrates prompt execution, injects system prompt, and returns plain string', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{"projectName": "Orchestrated SaaS", "tasks": []}' }],
              },
            },
          ],
        }),
      } as Response);

      const rawResult = await executeAiPrompt({
        prompt: 'Campaña de marketing',
        provider: 'gemini',
        apiKey: 'valid-key',
      });

      expect(rawResult).toBe('{"projectName": "Orchestrated SaaS", "tasks": []}');
    });

    it('throws AIAuthenticationError when no API Key is available', async () => {
      await expect(
        executeAiPrompt({
          prompt: 'Campaña sin clave',
          provider: 'gemini',
          apiKey: '',
        })
      ).rejects.toThrowError(AIAuthenticationError);
    });
  });
});
