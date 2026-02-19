from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas


# Obtener usuario por ID (con opción de cargar proyectos)
async def get_user(db: AsyncSession, user_id: int, load_projects: bool = False):
    from sqlalchemy.orm import selectinload

    query = select(models.User).filter(models.User.id == user_id)
    if load_projects:
        query = query.options(selectinload(models.User.projects))

    result = await db.execute(query)
    return result.scalars().first()


# Obtener usuario por Email (para login)
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).filter(models.User.email == email))
    return result.scalars().first()


# Crear un usuario nuevo
async def create_user(db: AsyncSession, user: schemas.UserCreate):
    # Nota: En producción aquí hasheariamos el password
    fake_hashed_password = user.password + "notreallyhashed"

    db_user = models.User(email=user.email, hashed_password=fake_hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


# Crear un proyecto para un usuario
async def create_user_project(
    db: AsyncSession, project: schemas.ProjectCreate, user_id: int
):
    db_project = models.Project(**project.model_dump(), owner_id=user_id)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project
