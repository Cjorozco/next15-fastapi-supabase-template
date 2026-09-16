import { AiProviderId, AiProviderClient } from './types';
import { GeminiProviderClient } from './adapters/gemini-adapter';
import { GroqProviderClient } from './adapters/groq-adapter';

/**
 * Simple Factory for instantiating AI provider adapters.
 */
export function createAiProviderClient(
  provider: AiProviderId,
  config?: { apiKey?: string; model?: string }
): AiProviderClient {
  switch (provider) {
    case 'gemini':
      return new GeminiProviderClient(config);
    case 'groq':
      return new GroqProviderClient(config);
    default: {
      const _exhaustiveCheck: never = provider;
      throw new Error(`Proveedor de IA no soportado: ${_exhaustiveCheck}`);
    }
  }
}
