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
import { requestValidatedAiJson } from './validated-request';
import { DEFAULT_AI_TIMEOUT_MS, executeAiPrompt, UNIFIED_SYSTEM_INSTRUCTION } from './ai-gateway';

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
        timeoutMs: callOptions?.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
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
      // Validates with safeParse and retries once with the validation issues.
      return requestValidatedAiJson({
        schema,
        prompt,
        systemInstruction,
        provider,
        apiKey,
        timeoutMs: callOptions?.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
        temperature: callOptions?.temperature,
        model: callOptions?.model,
      });
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
