/// <reference types="cypress" />

describe('Authentication', () => {
  // ---------------------------------------------------------------
  // Test 1: Login page – renders correctly & validates credentials
  // ---------------------------------------------------------------
  describe('Login page', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('renders the login form with all expected elements', () => {
      cy.contains('h1', 'Project Manager').should('be.visible');
      cy.contains('Inicia sesión para continuar').should('be.visible');
      cy.get('[data-cy="login-email"]').should('be.visible');
      cy.get('[data-cy="login-password"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('be.visible').and('contain', 'Iniciar sesión');
      cy.contains('a', 'Regístrate').should('have.attr', 'href', '/register');
    });

    it('shows an error message with invalid credentials', () => {
      cy.get('[data-cy="login-email"]').type('fake-user@nonexistent.com');
      cy.get('[data-cy="login-password"]').type('wrongpassword123');
      cy.get('[data-cy="login-submit"]').click();

      cy.get('[data-cy="login-error"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'incorrectos');
    });

    it('logs in successfully with valid credentials and redirects to dashboard', () => {
      const email = Cypress.env('TEST_EMAIL');
      const password = Cypress.env('TEST_PASSWORD');

      cy.get('[data-cy="login-email"]').type(email);
      cy.get('[data-cy="login-password"]').type(password);
      cy.get('[data-cy="login-submit"]').click();

      // Should redirect to dashboard
      cy.url({ timeout: 15000 }).should('eq', `${Cypress.config('baseUrl')}/`);
      cy.contains('h2', 'Dashboard', { timeout: 10000 }).should('be.visible');
    });
  });

  // ---------------------------------------------------------------
  // Test 2: Auth guard – redirects unauthenticated users
  // ---------------------------------------------------------------
  describe('Auth guard', () => {
    it('redirects unauthenticated users from / to /login', () => {
      cy.visit('/');
      cy.url({ timeout: 10000 }).should('include', '/login');
    });

    it('redirects unauthenticated users from /projects to /login', () => {
      cy.visit('/projects');
      cy.url({ timeout: 10000 }).should('include', '/login');
    });
  });

  // ---------------------------------------------------------------
  // Test 3: Logout flow
  // ---------------------------------------------------------------
  describe('Logout', () => {
    beforeEach(() => {
      cy.login();
      cy.visit('/');
      cy.contains('h2', 'Dashboard', { timeout: 15000 }).should('be.visible');
    });

    it('logs out and redirects to login page', () => {
      cy.get('[data-cy="sidebar-logout"]').click();

      cy.url({ timeout: 10000 }).should('include', '/login');
      cy.contains('h1', 'Project Manager').should('be.visible');
      cy.contains('Inicia sesión para continuar').should('be.visible');
    });
  });
});
