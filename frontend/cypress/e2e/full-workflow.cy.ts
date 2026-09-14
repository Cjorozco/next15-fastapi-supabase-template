/// <reference types="cypress" />

/// <reference types="cypress" />

describe('Flujo completo: proyecto con tareas', () => {
  const now = Date.now();

  function loginAndVisitProjects() {
    cy.login();
    cy.visit('/projects', { timeout: 20000 });
    cy.contains('h2', 'Projects', { timeout: 20000 }).should('be.visible');
  }

  it('crea un proyecto desde el botón New Project en /projects', () => {
    const name = `Demo A ${now}`;
    loginAndVisitProjects();

    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(name);
    cy.get('[data-cy="save-project-btn"]').click();

    cy.contains('Create New Project').should('not.exist');
    cy.get('[data-cy="project-card"]').should('contain', name);
  });

  it('navega al detalle del proyecto, crea tareas y las completa', () => {
    const name = `Demo B ${now}`;
    loginAndVisitProjects();

    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(name);
    cy.get('[data-cy="save-project-btn"]').click();
    cy.get('[data-cy="project-card"]').should('contain', name);

    cy.contains(name).click();
    cy.url().should('include', '/projects/');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea A{enter}');
    cy.contains('Tarea A').should('be.visible');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea B{enter}');
    cy.contains('Tarea B').should('be.visible');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea C{enter}');
    cy.contains('Tarea C').should('be.visible');

    cy.contains('Tarea B')
      .parent()
      .find('button[role="checkbox"]')
      .click();

    cy.contains('1/3 tasks completed').should('be.visible');
    cy.contains('33%').should('be.visible');
  });

  it('elimina una tarea y verifica el contador', () => {
    const name = `Demo C ${now}`;
    loginAndVisitProjects();

    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(name);
    cy.get('[data-cy="save-project-btn"]').click();
    cy.get('[data-cy="project-card"]').should('contain', name);
    cy.contains(name).click();
    cy.url({ timeout: 10000 }).should('include', '/projects/');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Una tarea{enter}');
    cy.contains('Una tarea').should('be.visible');
    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Otra tarea{enter}');
    cy.contains('Otra tarea').should('be.visible');

    cy.contains('Otra tarea')
      .parent()
      .find('button[title="Delete task"]')
      .click({ force: true });

    cy.contains('Otra tarea').should('not.exist');
    cy.contains('1/1 tasks completed').should('not.exist');
  });
});
