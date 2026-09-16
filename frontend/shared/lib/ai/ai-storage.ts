import { AiProviderId } from './types';

export const AI_PROVIDER_STORAGE_KEY = 'ai_selected_provider';
export const GEMINI_STORAGE_KEY = 'gemini_api_key';
export const GROQ_STORAGE_KEY = 'groq_api_key';
export const AI_STORAGE_KEY = 'ai_api_key';

export const DEFAULT_PROVIDER: AiProviderId = 'gemini';

/**
 * Retrieves the selected AI provider from localStorage.
 */
export function getStoredProvider(): AiProviderId {
  if (typeof window === 'undefined') return DEFAULT_PROVIDER;
  const stored = localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
  if (stored === 'gemini' || stored === 'groq') {
    return stored;
  }
  return DEFAULT_PROVIDER;
}

/**
 * Saves the selected AI provider in localStorage.
 */
export function setStoredProvider(provider: AiProviderId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
}

/**
 * Retrieves the stored BYOK API key for the specified provider (or current provider).
 * Backward compatible with existing keys.
 */
export function getStoredApiKey(provider?: AiProviderId): string {
  if (typeof window === 'undefined') return '';
  const targetProvider = provider || getStoredProvider();

  if (targetProvider === 'gemini') {
    return (
      localStorage.getItem(GEMINI_STORAGE_KEY) ||
      localStorage.getItem(AI_STORAGE_KEY) ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ''
    );
  }

  if (targetProvider === 'groq') {
    return (
      localStorage.getItem(GROQ_STORAGE_KEY) ||
      process.env.NEXT_PUBLIC_GROQ_API_KEY ||
      ''
    );
  }

  return '';
}

/**
 * Stores the BYOK API key in localStorage for the specified provider.
 */
export function setStoredApiKey(key: string, provider?: AiProviderId): void {
  if (typeof window === 'undefined') return;
  const targetProvider = provider || getStoredProvider();
  const trimmed = key.trim();

  if (targetProvider === 'gemini') {
    if (trimmed) {
      localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
      localStorage.setItem(AI_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      localStorage.removeItem(AI_STORAGE_KEY);
    }
    return;
  }

  if (targetProvider === 'groq') {
    if (trimmed) {
      localStorage.setItem(GROQ_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GROQ_STORAGE_KEY);
    }
  }
}
