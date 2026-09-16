'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { AiProviderId } from './types';
import {
  getStoredProvider,
  setStoredProvider as saveStoredProvider,
  getStoredApiKey,
  setStoredApiKey as saveStoredApiKey,
} from './ai-storage';
import { executeAiPrompt, UNIFIED_SYSTEM_INSTRUCTION } from './ai-gateway';
import { safeParseAIResponse } from './safe-ai-parser';
import { AISchemaValidationError } from './ai-errors';

export interface UseAiClientOptions {
  initialProvider?: AiProviderId;
}

export function useAiClient(options?: UseAiClientOptions) {
  const [provider, setProviderState] = useState<AiProviderId>(() => {
    return options?.initialProvider || getStoredProvider();
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    return getStoredApiKey(options?.initialProvider || getStoredProvider());
  });

  const setProvider = useCallback((newProvider: AiProviderId) => {
    setProviderState(newProvider);
    saveStoredProvider(newProvider);
    const existingKey = getStoredApiKey(newProvider);
    setApiKeyState(existingKey);
  }, []);

  const setApiKey = useCallback(
    (newKey: string) => {
      setApiKeyState(newKey);
      saveStoredApiKey(newKey, provider);
    },
    [provider]
  );

  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0);

  const generate = useCallback(
    async (
      prompt: string,
      systemInstruction?: string,
      callOptions?: { timeoutMs?: number; temperature?: number; model?: string }
    ): Promise<string> => {
      return executeAiPrompt({
        prompt,
        systemInstruction,
        provider,
        apiKey,
        timeoutMs: callOptions?.timeoutMs ?? 8000,
        temperature: callOptions?.temperature,
        model: callOptions?.model,
      });
    },
    [provider, apiKey]
  );

  const generateStructured = useCallback(
    async <T extends z.ZodTypeAny>(
      prompt: string,
      schema: T,
      systemInstruction: string = UNIFIED_SYSTEM_INSTRUCTION,
      callOptions?: { timeoutMs?: number; temperature?: number; model?: string }
    ): Promise<z.infer<T>> => {
      const rawText = await executeAiPrompt({
        prompt,
        systemInstruction,
        provider,
        apiKey,
        timeoutMs: callOptions?.timeoutMs ?? 8000,
        temperature: callOptions?.temperature,
        model: callOptions?.model,
        responseFormat: 'json',
      });

      const parsed = safeParseAIResponse(schema, rawText);
      if (!parsed.success) {
        throw new AISchemaValidationError(parsed.error, parsed.formattedError);
      }

      return parsed.data;
    },
    [provider, apiKey]
  );

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    hasApiKey,
    isConfigured: hasApiKey,
    generate,
    generateStructured,
  };
}
