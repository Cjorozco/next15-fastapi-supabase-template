/// <reference types="cypress" />

describe('Navigation', () => {
  // ---------------------------------------------------------------
  // Test 4: Sidebar navigation between Dashboard and Projects
  // ---------------------------------------------------------------
  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.contains('h2', 'Dashboard', { timeout: 15000 }).should('be.visible');
  });

  it('navigates from Dashboard to Projects via sidebar', () => {
    cy.get('[data-cy="nav-projects"]').click();

    cy.url().should('include', '/projects');
    cy.contains('h2', 'Projects', { timeout: 10000 }).should('be.visible');
  });

  it('navigates from Projects back to Dashboard via sidebar', () => {
    // First go to Projects
    cy.get('[data-cy="nav-projects"]').click();
    cy.url().should('include', '/projects');
    cy.contains('h2', 'Projects', { timeout: 10000 }).should('be.visible');

    // Navigate back to Dashboard
    cy.get('[data-cy="nav-dashboard"]').click();

    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('h2', 'Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('highlights the active link in the sidebar', () => {
    // On Dashboard, the Dashboard link should be active
    cy.get('[data-cy="nav-dashboard"]').should('have.class', 'bg-slate-800');

    // Navigate to Projects
    cy.get('[data-cy="nav-projects"]').click();
    cy.url().should('include', '/projects');

    // Projects link should now be active
    cy.get('[data-cy="nav-projects"]').should('have.class', 'bg-slate-800');
  });
});
