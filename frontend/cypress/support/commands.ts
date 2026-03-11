/// <reference types="cypress" />

// ---------------------------------------------------------------------------
// Custom command: cy.login(email, password)
//
// Authenticates via Supabase REST API and sets the session cookies so that
// the Next.js middleware (which reads cookies via @supabase/ssr) recognises
// the user as authenticated.
// ---------------------------------------------------------------------------

const supabaseUrl = Cypress.env('SUPABASE_URL') || '';
const supabaseAnonKey = Cypress.env('SUPABASE_ANON_KEY') || '';

Cypress.Commands.add('login', (email?: string, password?: string) => {
  const testEmail = email ?? Cypress.env('TEST_EMAIL');
  const testPassword = password ?? Cypress.env('TEST_PASSWORD');

  if (!testEmail || !testPassword) {
    throw new Error(
      'Missing test credentials. Set CYPRESS_TEST_EMAIL and CYPRESS_TEST_PASSWORD env vars.'
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase config. Set CYPRESS_SUPABASE_URL and CYPRESS_SUPABASE_ANON_KEY env vars.'
    );
  }

  // Call Supabase REST API directly to get session tokens
  cy.request({
    method: 'POST',
    url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: {
      email: testEmail,
      password: testPassword,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);

    const { access_token, refresh_token } = response.body;
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

    // Build the cookie name that @supabase/ssr uses
    const cookieBase = `sb-${projectRef}-auth-token`;

    // @supabase/ssr stores the session as a JSON string, potentially chunked.
    // For the middleware to pick it up, we need to set it as a cookie.
    const sessionData = JSON.stringify({
      access_token,
      refresh_token,
      token_type: 'bearer',
      expires_in: response.body.expires_in,
      expires_at: response.body.expires_at,
      user: response.body.user,
    });

    // @supabase/ssr may chunk cookies if >3180 chars. Set base + chunked.
    const CHUNK_SIZE = 3180;
    if (sessionData.length <= CHUNK_SIZE) {
      // Single cookie — encode as base64 per @supabase/ssr format
      const encoded = `base64-${btoa(sessionData)}`;
      cy.setCookie(`${cookieBase}.0`, encoded, {
        path: '/',
        sameSite: 'lax',
      });
    } else {
      // Chunked cookies
      const encoded = `base64-${btoa(sessionData)}`;
      const chunks = Math.ceil(encoded.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        cy.setCookie(
          `${cookieBase}.${i}`,
          encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          { path: '/', sameSite: 'lax' }
        );
      }
    }

    // Also set localStorage so the client-side Supabase picks it up
    const storageKey = `sb-${projectRef}-auth-token`;
    window.localStorage.setItem(storageKey, sessionData);
  });
});

// ---------------------------------------------------------------------------
// TypeScript declaration merging so cy.login() is recognized
// ---------------------------------------------------------------------------

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Programmatic login via Supabase REST API. Falls back to
       * CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD env vars.
       */
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

export {};
