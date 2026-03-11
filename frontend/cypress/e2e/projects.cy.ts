/// <reference types="cypress" />

describe('Projects', () => {
  // ---------------------------------------------------------------
  // Test 5: Create a new project
  // ---------------------------------------------------------------
  const projectName = `Cypress Test Project ${Date.now()}`;
  const projectDescription = 'Automated E2E test project — safe to delete';

  beforeEach(() => {
    cy.login();
    cy.visit('/projects');
    cy.contains('h2', 'Projects', { timeout: 15000 }).should('be.visible');
  });

  it('opens the create project form and fills it in', () => {
    cy.get('[data-cy="new-project-btn"]').click();

    // Form should appear
    cy.contains('Create New Project').should('be.visible');
    cy.get('[data-cy="project-name-input"]').should('be.visible');
    cy.get('[data-cy="project-desc-input"]').should('be.visible');
    cy.get('[data-cy="save-project-btn"]').should('be.visible');
  });

  it('creates a new project successfully', () => {
    cy.get('[data-cy="new-project-btn"]').click();

    cy.get('[data-cy="project-name-input"]').type(projectName);
    cy.get('[data-cy="project-desc-input"]').type(projectDescription);
    cy.get('[data-cy="save-project-btn"]').click();

    // The form should close and the new project card should appear
    cy.contains('Create New Project', { timeout: 5000 }).should('not.exist');
    cy.get('[data-cy="project-card"]', { timeout: 10000 })
      .should('contain', projectName);
  });

  it('cancels project creation without creating', () => {
    cy.get('[data-cy="new-project-btn"]').click();
    cy.contains('Create New Project').should('be.visible');

    // Click Cancel button within the form
    cy.contains('button', 'Cancel').last().click();

    // Form should disappear
    cy.contains('Create New Project').should('not.exist');
  });
});
