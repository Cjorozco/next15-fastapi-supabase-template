# app/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 1. CARGAR EL ARCHIVO .ENV (Asegúrate que esté en la raíz de /backend)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# VALIDACIÓN DE SEGURIDAD
if DATABASE_URL is None:
    raise ValueError(
        "❌ ERROR: No se encontró la variable DATABASE_URL. Revisa tu archivo .env"
    )

# 2. CONFIGURACIÓN DEL MOTOR (Con el parche para Supabase/PgBouncer)
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
