import { GROQ_MODELS, DEFAULT_GROQ_MODEL } from './adapters/groq-adapter';
import { GEMINI_FALLBACK_MODELS, DEFAULT_GEMINI_MODEL } from './adapters/gemini-adapter';

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  tier: 'production' | 'preview' | 'safeguard';
  speedTps?: number;
  recommended?: boolean;
}

export const GROQ_MODEL_CONFIGS: Record<string, ModelMetadata> = {
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT-OSS 120B',
    description: 'Modelo insignia de producción. Máxima precisión y razonamiento para estructuración de proyectos.',
    tier: 'production',
    speedTps: 500,
    recommended: true,
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT-OSS 20B',
    description: 'Ultrarrápido y liviano. Inferencia en milisegundos con alta eficiencia de tokens.',
    tier: 'production',
    speedTps: 1000,
  },
  'groq/compound': {
    id: 'groq/compound',
    name: 'Groq Compound',
    description: 'Sistema de producción completo de Groq con soporte de herramientas y búsqueda integrada.',
    tier: 'production',
    speedTps: 450,
  },
  'qwen/qwen3.8-27b': {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    description: 'Modelo multilingüe de alta capacidad para razonamiento y planificación.',
    tier: 'preview',
    speedTps: 450,
  },
  'openai/gpt-oss-safeguard-20b': {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'OpenAI GPT-OSS Safeguard 20B',
    description: 'Variante con filtros de seguridad y moderación reforzados.',
    tier: 'safeguard',
    speedTps: 1000,
  },
  'meta-llama/llama-prompt-guard-2-86m': {
    id: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Llama Prompt Guard 2 86M',
    description: 'Modelo guardián para protección contra prompt injection y jailbreaks.',
    tier: 'safeguard',
  },
  'meta-llama/llama-prompt-guard-2-22m': {
    id: 'meta-llama/llama-prompt-guard-2-22m',
    name: 'Llama Prompt Guard 2 22M',
    description: 'Modelo guardián ultra-liviano para validación de prompts.',
    tier: 'safeguard',
  },
};

export const AI_SETTINGS_CONFIG = {
  gemini: {
    name: 'Google Gemini',
    defaultModel: DEFAULT_GEMINI_MODEL,
    availableModels: GEMINI_FALLBACK_MODELS,
    description: 'Inferencia nativa REST con baja latencia (thinkingBudget: 0) y validación defensiva Zod.',
  },
  groq: {
    name: 'Groq Cloud',
    defaultModel: DEFAULT_GROQ_MODEL,
    availableModels: GROQ_MODELS,
    description: 'Inferencia ultra-rápida (500 - 1000 tps) con GPT-OSS 120B y sistemas Compound de producción.',
  },
};
