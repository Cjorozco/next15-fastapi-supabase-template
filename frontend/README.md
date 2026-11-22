# Project Manager — Frontend

Frontend for the SaaS project management app built with Next.js 15, TypeScript, Tailwind CSS, and Convex.

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript (Strict mode)
- **Estilos**: Tailwind CSS
- **Componentes UI**: Shadcn/UI
- **Backend**: Convex (serverless functions + managed DB)
- **Auth**: Supabase Auth (JWT verification via Convex)
- **Iconos**: Lucide React
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable

## Requisitos Previos

- Node.js 18.17+
- Cuenta de [Convex](https://convex.dev)
- Proyecto de [Supabase](https://supabase.com) (para auth)

## Instalación

```bash
# Instalar dependencias
npm install
```

## Desarrollo

```bash
# Iniciar Convex dev server (en una terminal)
npx convex dev

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
NEXT_PUBLIC_CONVEX_URL=https://TU_DEPLOYMENT.convex.cloud
```

## Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
│   ├── page.tsx         # Dashboard
│   └── projects/
│       ├── page.tsx     # Lista y creación de proyectos
│       └── [id]/page.tsx # Detalle del proyecto
├── components/          # Componentes React
├── hooks/               # Custom hooks (Convex: useProjects, useTasks)
├── lib/                 # Supabase client, Convex provider
└── types/               # Definiciones TypeScript

convex/                  # Backend Convex
├── auth.config.ts       # Verificación JWT de Supabase
├── schema.ts            # Esquema de base de datos
├── projects.ts          # CRUD de proyectos
├── tasks.ts             # CRUD de tareas
└── users.ts             # Sincronización de usuarios
```

## Características

- ✅ Dashboard profesional con diseño limpio tipo banca
- ✅ Sidebar de navegación
- ✅ Cards de proyectos con barra de progreso
- ✅ Drag-and-drop para reordenar tareas
- ✅ Estados de loading, error y empty
- ✅ Integración con Convex para datos y autenticación en tiempo real
- ✅ Notificaciones con Sonner
- ✅ Tests unitarios y de integración con Vitest (Convex Test + Testing Library)

## Servidor MCP (solo lectura)

Permite que Claude lea los proyectos y tareas desde el chat. Endpoint: `https://<tu-dominio>/api/mcp` (Streamable HTTP). Código: `src/app/api/mcp/route.ts`, `domains/mcp/lib/` y `convex/mcp.ts`.

**Qué expone** (fase 1, solo lectura):

- `listar_proyectos`: id, nombre, estado, fecha límite y tareas pendientes.
- `listar_tareas`: filtros `proyecto_id`, `estado` (`pendiente` / `en_progreso` / `completada`) y `fecha` (`hoy` = la vista Hoy; `semana` = vencidas y de esta semana). Páginas de 200: si la respuesta trae `siguiente`, se pide el resto con `desde`. Las fechas, en `YYYY-MM-DD` hora de Bogotá.
- `obtener_tarea`: detalle de una tarea (notas, horas, subtareas).

**Qué NO expone:** el código del repo, claves o variables de entorno, datos de otros usuarios (actúa siempre como un único usuario fijo) y ninguna escritura ni borrado.

### Configurar

1. Genera dos secretos distintos (no los guardes en el repo):
   ```bash
   openssl rand -hex 32   # MCP_ACCESS_TOKEN
   openssl rand -hex 32   # MCP_CONVEX_SECRET
   ```
2. En **Vercel** (Settings → Environment Variables, solo Production): `MCP_ACCESS_TOKEN` y `MCP_CONVEX_SECRET`. Para probar en local, en `.env.local`.
3. En **Convex** (el despliegue que usa ese entorno):
   ```bash
   npx convex env set MCP_CONVEX_SECRET <mismo valor que en Vercel>
   npx convex env set MCP_USER_TOKEN_IDENTIFIER "<SUPABASE_URL>/auth/v1|<id de tu usuario en Supabase>"
   ```
   El id está en Supabase → Authentication → Users. Para producción añade `--prod`.
4. Redespliega en Vercel.

Si falta cualquiera de las variables, el endpoint no devuelve datos: sin token válido responde `401`.

### Conectar en Claude

En Claude: Settings → Connectors → *Add custom connector*. URL: `https://<tu-dominio>/api/mcp`. En **Request headers** añade `Authorization` con el valor `Bearer <MCP_ACCESS_TOKEN>`. Luego pregunta, por ejemplo, "¿qué tengo hoy?".

Para rotar el token: genera uno nuevo, cámbialo en Vercel, redespliega y actualiza la cabecera del conector.
