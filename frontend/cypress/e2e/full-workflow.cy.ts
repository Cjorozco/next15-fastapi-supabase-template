/// <reference types="cypress" />

describe('Flujo completo: proyecto con tareas', () => {
  const projectName = `Demo ${Date.now()}`;

  beforeEach(() => {
    cy.login();
    cy.visit('/');
    cy.contains('h2', 'Dashboard', { timeout: 15000 }).should('be.visible');
  });

  it('crea un proyecto desde el botón New Project en /projects', () => {
    cy.visit('/projects');
    cy.contains('h2', 'Projects').should('be.visible');

    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(projectName);
    cy.get('[data-cy="project-desc-input"]').type('Proyecto de prueba automatizada');
    cy.get('[data-cy="save-project-btn"]').click();

    cy.contains('Create New Project').should('not.exist');
    cy.get('[data-cy="project-card"]').should('contain', projectName);
  });

  it('navega al detalle del proyecto, crea tareas y las completa', () => {
    cy.visit('/projects');
    cy.contains('h2', 'Projects').should('be.visible');

    // Crear proyecto primero
    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(projectName);
    cy.get('[data-cy="save-project-btn"]').click();
    cy.get('[data-cy="project-card"]').should('contain', projectName);

    // Click en el nombre del proyecto para ir al detalle
    cy.contains(projectName).click();
    cy.url().should('include', '/projects/');

    // Crear tareas una por una
    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea A{enter}');
    cy.contains('Tarea A').should('be.visible');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea B{enter}');
    cy.contains('Tarea B').should('be.visible');

    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Tarea C{enter}');
    cy.contains('Tarea C').should('be.visible');

    // Completar la tarea del medio
    cy.contains('Tarea B')
      .parent()
      .find('button[role="checkbox"]')
      .click();

    // Verificar que el progreso se actualizó
    cy.contains('1/3 tasks completed').should('be.visible');
    cy.contains('33%').should('be.visible');
  });

  it('elimina una tarea y verifica el contador', () => {
    cy.visit('/projects');
    cy.get('[data-cy="new-project-btn"]').click();
    cy.get('[data-cy="project-name-input"]').type(projectName);
    cy.get('[data-cy="save-project-btn"]').click();
    cy.contains(projectName).click();

    // Crear dos tareas
    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Una tarea{enter}');
    cy.contains('New Task').click();
    cy.get('input[placeholder="Task name..."]').type('Otra tarea{enter}');

    // Eliminar la segunda
    cy.contains('Otra tarea')
      .parent()
      .find('button[title="Borrar tarea"]')
      .click({ force: true });

    cy.contains('Otra tarea').should('not.exist');
    cy.contains('1/1 tasks completed').should('not.exist');
  });
});
