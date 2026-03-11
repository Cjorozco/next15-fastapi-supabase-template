import { defineConfig } from 'cypress';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local to pick up NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
function loadEnvLocal(): Record<string, string> {
  try {
    const envPath = resolve(__dirname, '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      vars[key.trim()] = rest.join('=').trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const envLocal = loadEnvLocal();

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Auto-populate Supabase env vars from .env.local
      // so the user only needs to set TEST_EMAIL + TEST_PASSWORD
      config.env.SUPABASE_URL = config.env.SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL || '';
      config.env.SUPABASE_ANON_KEY = config.env.SUPABASE_ANON_KEY || envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      return config;
    },
  },
});
