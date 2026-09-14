import { createBrowserClient } from '@supabase/ssr';

// Singleton — @supabase/ssr reutiliza la instancia si los parámetros son iguales
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
