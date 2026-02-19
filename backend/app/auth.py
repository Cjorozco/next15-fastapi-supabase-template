import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from . import models, database

security = HTTPBearer()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hxgeqfboychzprsaiwkj.supabase.co")

# PyJWKClient descarga y cachea automáticamente las claves públicas de Supabase
# Soporta ES256 y RS256 (lo que usen proyectos nuevos y antiguos)
jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(database.get_db),
) -> models.User:
    token = credentials.credentials

    try:
        # Obtiene la clave pública correcta según el 'kid' del header del token
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")
    except Exception as e:
        print(f"❌ ERROR INESPERADO en JWKS/decode: {type(e).__name__}: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error de autenticación: {type(e).__name__}: {e}"
        )

    email: str = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Token sin email")

    # Buscar usuario existente o crearlo en el primer login
    result = await db.execute(select(models.User).filter(models.User.email == email))
    user = result.scalars().first()

    if not user:
        user = models.User(email=email, hashed_password="supabase_managed")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user
