from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from . import database, models, schemas
from .auth import get_current_user

app = FastAPI(title="Project Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://project-manager-web-five.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    print("✅ Tablas sincronizadas correctamente")


# --- USUARIOS ---


@app.get("/me", response_model=schemas.UserMe)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Devuelve el usuario autenticado. Crea el registro si es su primer login."""
    return current_user


# --- PROYECTOS ---


@app.post("/projects", response_model=schemas.Project)
async def create_project(
    project: schemas.ProjectCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = await db.execute(
        select(models.Project).filter(
            models.Project.owner_id == current_user.id,
            models.Project.name == project.name,
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Ya tienes un proyecto con el nombre '{project.name}'",
        )

    new_project = models.Project(
        name=project.name,
        description=project.description,
        owner_id=current_user.id,
    )
    db.add(new_project)
    await db.commit()

    result = await db.execute(
        select(models.Project)
        .filter(models.Project.id == new_project.id)
        .options(selectinload(models.Project.tasks))
    )
    return result.scalars().first()


@app.get("/projects/{project_id}", response_model=schemas.Project)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Project)
        .filter(
            models.Project.id == project_id, models.Project.owner_id == current_user.id
        )
        .options(selectinload(models.Project.tasks))
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@app.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id,
        )
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    await db.delete(project)
    await db.commit()


@app.get("/users/{user_id}/projects/", response_model=List[schemas.Project])
async def read_user_projects(
    user_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Seguridad: solo permite ver los propios proyectos
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    result = await db.execute(
        select(models.Project)
        .filter(models.Project.owner_id == current_user.id)
        .order_by(models.Project.id.desc())
        .options(selectinload(models.Project.tasks))
    )
    return result.scalars().all()


# --- TAREAS ---


@app.post("/projects/{project_id}/tasks/", response_model=schemas.Task)
async def create_task_for_project(
    project_id: int,
    task: schemas.TaskCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verificar que el proyecto pertenece al usuario
    project_result = await db.execute(
        select(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == current_user.id,
        )
    )
    if not project_result.scalars().first():
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    new_task = models.Task(**task.model_dump(), project_id=project_id)
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task


@app.patch("/tasks/{task_id}", response_model=schemas.Task)
async def update_task_status(
    task_id: int,
    is_completed: bool,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(select(models.Task).filter(models.Task.id == task_id))
    db_task = result.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    db_task.is_completed = is_completed
    await db.commit()
    await db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(select(models.Task).filter(models.Task.id == task_id))
    db_task = result.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    await db.delete(db_task)
    await db.commit()


@app.get("/")
def read_root():
    return {"status": "Backend Python Corriendo 🚀"}
