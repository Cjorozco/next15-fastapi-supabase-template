import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

// Se crea en el primer uso, no al importar el módulo: así `next build` no
// exige las variables de Supabase al prerenderizar páginas que no lo usan.
// @supabase/ssr reutiliza la instancia si los parámetros son iguales.
function getClient(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = Reflect.get(getClient(), prop);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});
