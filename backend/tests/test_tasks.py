"""Tests for task creation and update endpoints."""

import pytest


@pytest.mark.asyncio
async def test_create_task(client):
    """POST /projects/{id}/tasks/ should create a task."""
    project = await client.post(
        "/projects", json={"name": "Proyecto con Tareas", "description": ""}
    )
    project_id = project.json()["id"]

    response = await client.post(
        f"/projects/{project_id}/tasks/", json={"title": "Tarea de prueba"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Tarea de prueba"
    assert data["is_completed"] is False
    assert data["project_id"] == project_id


@pytest.mark.asyncio
async def test_complete_task(client):
    """PATCH /tasks/{id}?is_completed=true should mark the task as done."""
    project = await client.post(
        "/projects", json={"name": "Proyecto", "description": ""}
    )
    project_id = project.json()["id"]

    task = await client.post(
        f"/projects/{project_id}/tasks/", json={"title": "Completar esto"}
    )
    task_id = task.json()["id"]

    response = await client.patch(f"/tasks/{task_id}?is_completed=true")
    assert response.status_code == 200
    assert response.json()["is_completed"] is True


@pytest.mark.asyncio
async def test_delete_task(client):
    """DELETE /tasks/{id} should remove the task."""
    project = await client.post(
        "/projects", json={"name": "Proyecto", "description": ""}
    )
    project_id = project.json()["id"]

    task = await client.post(
        f"/projects/{project_id}/tasks/", json={"title": "Borrar esto"}
    )
    task_id = task.json()["id"]

    response = await client.delete(f"/tasks/{task_id}")
    assert response.status_code == 204
