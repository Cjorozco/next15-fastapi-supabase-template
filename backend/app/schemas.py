from pydantic import BaseModel
from typing import List, Optional


# --- TAREAS ---
class TaskBase(BaseModel):
    title: str
    is_completed: bool = False
    position: int = 0


class TaskCreate(TaskBase):
    pass


class TaskReorder(BaseModel):
    task_ids: List[int]


class Task(TaskBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True


# --- PROYECTOS ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: int
    owner_id: int
    tasks: List[Task] = []  # Incluimos sus tareas

    class Config:
        from_attributes = True


# --- USUARIOS (Actualizado) ---
class UserCreate(BaseModel):
    email: str
    password: str


class User(BaseModel):
    id: int
    email: str
    projects: List[Project] = []

    class Config:
        from_attributes = True


# Schema ligero para GET /me — sin lazy-load de relaciones
class UserMe(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True
