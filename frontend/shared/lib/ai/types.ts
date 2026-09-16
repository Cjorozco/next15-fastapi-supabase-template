export type AiProviderId = 'gemini' | 'groq';

export interface AiGenerateRequest {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text';
  model?: string;
}

export interface AiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  apiKey?: string;
}

export interface AiProviderConfig {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
}

/**
 * Common abstraction for all client-side AI providers (Gemini, Groq, etc.).
 * Returns raw plain text string ready for defensive Zod validation.
 */
export interface AiProviderClient {
  readonly providerId: AiProviderId;
  generate(request: AiGenerateRequest, options?: AiRequestOptions): Promise<string>;
}
