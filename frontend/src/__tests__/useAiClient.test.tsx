import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAiClient } from '@/shared/lib/ai/useAiClient';
import { z } from 'zod';

describe('useAiClient Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with default provider and empty key when storage is empty', () => {
    const { result } = renderHook(() => useAiClient());
    expect(result.current.provider).toBe('gemini');
    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
  });

  it('updates provider and persists key per provider', () => {
    const { result } = renderHook(() => useAiClient());

    act(() => {
      result.current.setApiKey('gemini-key-1');
    });
    expect(result.current.apiKey).toBe('gemini-key-1');
    expect(result.current.hasApiKey).toBe(true);

    act(() => {
      result.current.setProvider('groq');
    });
    expect(result.current.provider).toBe('groq');
    expect(result.current.apiKey).toBe(''); // No key yet for Groq

    act(() => {
      result.current.setApiKey('groq-key-2');
    });
    expect(result.current.apiKey).toBe('groq-key-2');

    // Switching back to Gemini recovers Gemini's key
    act(() => {
      result.current.setProvider('gemini');
    });
    expect(result.current.provider).toBe('gemini');
    expect(result.current.apiKey).toBe('gemini-key-1');
  });

  it('generateStructured parses and validates schema safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ name: 'Structured Test', count: 5 }) }],
            },
          },
        ],
      }),
    } as Response);

    const { result } = renderHook(() => useAiClient());

    act(() => {
      result.current.setApiKey('test-key');
    });

    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });

    let data;
    await act(async () => {
      data = await result.current.generateStructured('Test prompt', schema);
    });

    expect(data).toEqual({ name: 'Structured Test', count: 5 });
  });
});
