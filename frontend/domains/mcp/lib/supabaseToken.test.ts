import { describe, expect, test } from 'vitest';
import { authInfoFromClaims, supabaseIssuer } from './supabaseToken';

const ISSUER = supabaseIssuer('https://ref.supabase.co/');

const claims = {
  iss: ISSUER,
  aud: 'authenticated',
  sub: 'user-uuid',
  exp: 2_000_000_000,
  client_id: 'claude-client',
  scope: 'openid email',
};

describe('authInfoFromClaims', () => {
  test('accepts a user token Convex would accept', () => {
    expect(authInfoFromClaims(claims, 'tok', ISSUER)).toEqual({
      token: 'tok',
      clientId: 'claude-client',
      scopes: ['openid', 'email'],
      expiresAt: 2_000_000_000,
    });
  });

  test('accepts an audience list that includes "authenticated"', () => {
    expect(
      authInfoFromClaims({ ...claims, aud: ['other', 'authenticated'] }, 'tok', ISSUER)
    ).toBeDefined();
  });

  test('rejects another issuer, audience or a missing subject', () => {
    expect(authInfoFromClaims({ ...claims, iss: 'https://evil/auth/v1' }, 'tok', ISSUER)).toBeUndefined();
    expect(authInfoFromClaims({ ...claims, aud: 'anon' }, 'tok', ISSUER)).toBeUndefined();
    expect(authInfoFromClaims({ ...claims, sub: '' }, 'tok', ISSUER)).toBeUndefined();
  });

  test('normalizes the issuer without a trailing slash', () => {
    expect(ISSUER).toBe('https://ref.supabase.co/auth/v1');
  });
});
