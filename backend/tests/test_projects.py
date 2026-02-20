"""Tests for the /projects endpoints."""


async def test_create_project(client):
    """POST /projects should create a project and return it."""
    response = await client.post(
        "/projects",
        json={"name": "Mi Proyecto Test", "description": "Descripción de prueba"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Mi Proyecto Test"
    assert data["description"] == "Descripción de prueba"
    assert "id" in data
    assert data["tasks"] == []


async def test_create_duplicate_project(client):
    """POST /projects with same name should return 400."""
    payload = {"name": "Duplicado", "description": ""}
    await client.post("/projects", json=payload)
    response = await client.post("/projects", json=payload)
    assert response.status_code == 400
    assert "Duplicado" in response.json()["detail"]


async def test_list_projects(client):
    """GET /users/1/projects/ should return list of user's projects."""
    await client.post("/projects", json={"name": "Proyecto A", "description": ""})
    await client.post("/projects", json={"name": "Proyecto B", "description": ""})

    response = await client.get("/users/1/projects/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    names = [p["name"] for p in data]
    assert "Proyecto A" in names
    assert "Proyecto B" in names


async def test_delete_project(client):
    """DELETE /projects/{id} should remove the project."""
    create_resp = await client.post(
        "/projects", json={"name": "Para Borrar", "description": ""}
    )
    project_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/projects/{project_id}")
    assert delete_resp.status_code == 204

    list_resp = await client.get("/users/1/projects/")
    names = [p["name"] for p in list_resp.json()]
    assert "Para Borrar" not in names
