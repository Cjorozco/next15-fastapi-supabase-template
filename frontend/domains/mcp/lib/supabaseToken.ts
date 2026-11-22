import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/server';

/**
 * Access tokens for the MCP are Supabase JWTs issued by its OAuth 2.1 server (or by a
 * normal app session). They are the same tokens Convex already trusts
 * (`convex/auth.config.ts`), so the MCP forwards them to Convex and every query runs as
 * the user who approved the connection.
 */

/** Issuer of the project's tokens: `<SUPABASE_URL>/auth/v1`. */
export function supabaseIssuer(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
}

/** Same audience Convex requires (`applicationID` in `convex/auth.config.ts`). */
const CONVEX_AUDIENCE = 'authenticated';

interface Claims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  client_id?: unknown;
  scope?: unknown;
}

/**
 * AuthInfo for verified claims, or undefined when they are not a user token of this
 * project that Convex would accept. The signature is checked before this runs.
 */
export function authInfoFromClaims(
  claims: Claims,
  token: string,
  issuer: string
): AuthInfo | undefined {
  if (claims.iss !== issuer) return undefined;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(CONVEX_AUDIENCE)) return undefined;
  if (typeof claims.sub !== 'string' || claims.sub === '') return undefined;
  return {
    token,
    clientId: typeof claims.client_id === 'string' ? claims.client_id : 'app',
    scopes: typeof claims.scope === 'string' ? claims.scope.split(' ').filter(Boolean) : [],
    ...(typeof claims.exp === 'number' ? { expiresAt: claims.exp } : {}),
  };
}

let verifier: SupabaseClient | undefined;

/**
 * Verifies the signature and expiry with the project's JWKS (`getClaims` caches the keys
 * and checks ES256 locally), then the claims. Undefined means "answer 401".
 */
export async function verifySupabaseToken(token: string | undefined): Promise<AuthInfo | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return undefined;

  verifier ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await verifier.auth.getClaims(token);
    if (error || !data) return undefined;
    return authInfoFromClaims(data.claims, token, supabaseIssuer(url));
  } catch {
    return undefined;
  }
}
