# Migracion a Convex

Este proyecto conserva Supabase para la autenticacion y sustituye FastAPI,
SQLAlchemy y PostgreSQL por Convex para los datos de proyectos y tareas.

## 1. Crear el proyecto Convex

Desde `frontend/`, instala las dependencias y ejecuta el entorno de desarrollo:

```bash
npm install
npx convex dev
```

En el asistente de Convex:

1. Inicia sesion o crea una cuenta de Convex.
2. Selecciona `Create a new project`.
3. Elige un nombre para el proyecto y el deployment de desarrollo.
4. Conserva `convex` como directorio de funciones.

El comando genera `convex/_generated/`, publica el esquema y escribe
`NEXT_PUBLIC_CONVEX_URL` en `frontend/.env.local`. Dejalo ejecutandose mientras
desarrollas; vuelve a publicar las funciones al guardar cambios.

## 2. Configurar Supabase como proveedor de autenticacion

Convex valida el access token emitido por Supabase. En Supabase Dashboard:

1. Abre `Project Settings` y despues `API > JWT Keys`.
2. Si el proyecto aun usa la clave JWT heredada HS256, crea una clave asimetrica
   ES256 y conviertela en primaria. Las claves HS256 no exponen un JWKS que
   Convex pueda verificar.
3. Conserva las URLs de redirect que ya usa la aplicacion.

En otra terminal, desde `frontend/`, registra la URL de Supabase en el
deployment de desarrollo:

```bash
npx convex env set SUPABASE_URL https://TU_PROJECT_REF.supabase.co
```

`convex/auth.config.ts` consume esa variable y usa el JWKS publico de Supabase.
Tras cambiar las signing keys, cierra sesion y vuelve a iniciar sesion para
obtener un token firmado con ES256.

## 3. Arrancar y validar

El archivo `frontend/.env.local` debe contener estas variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
NEXT_PUBLIC_CONVEX_URL=https://TU_DEPLOYMENT.convex.cloud
```

Ejecuta `npm run dev` en una terminal distinta. Registra una cuenta o inicia
sesion, crea un proyecto, crea tareas, cambia su estado y reordena las tareas.
Las consultas Convex se actualizan en tiempo real, por lo que ya no se invalida
cache de React Query ni se llama al servidor FastAPI.

## 4. Datos existentes

Los identificadores de PostgreSQL y los `Id` de Convex no son compatibles. Si
no necesitas conservar datos, empieza vacio y desactiva el backend despues de
la validacion.

Si necesitas conservarlos, no apagues FastAPI ni Supabase Postgres todavia.
Exporta `users`, `projects` y `tasks`; crea primero los usuarios Convex usando
el `tokenIdentifier` de cada JWT Supabase, guarda la correspondencia de IDs y
despues importa proyectos y tareas con los nuevos IDs. Verifica el recuento y
la propiedad de cada proyecto antes de retirar PostgreSQL. La importacion debe
ser una mutacion temporal protegida con una clave de administrador y debe
eliminarse al terminar.

## 5. Produccion y retirada

Cuando desarrollo este validado:

```bash
npx convex deploy
```

Repite `npx convex env set SUPABASE_URL ...` para el deployment de produccion,
define `NEXT_PUBLIC_CONVEX_URL` de produccion en Vercel y vuelve a desplegar el
frontend. Solo despues de validar autenticacion, CRUD y datos migrados elimina
las variables `NEXT_PUBLIC_API_URL`, el cliente Axios y `backend/`.
