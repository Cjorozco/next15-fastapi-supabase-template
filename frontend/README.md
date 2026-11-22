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

## Servidor MCP

Permite que Claude lea, cree, edite y mueva tus proyectos y tareas desde el chat (sin borrar).

**URL de producción del conector:** `https://project-manager-web-five.vercel.app/api/mcp` (Streamable HTTP, HTTPS). Es la única que debe usar el conector de Claude: las URLs de cada despliegue (`project-manager-<hash>-….vercel.app`) están protegidas por Vercel, y `localhost` solo sirve en desarrollo.

Código: `src/app/api/mcp/route.ts`, `domains/mcp/lib/`, `src/app/.well-known/oauth-protected-resource/` y `src/app/oauth/consent/`.

**Lectura:**

- `listar_proyectos`: id, nombre, estado, fecha límite y tareas pendientes.
- `listar_tareas`: filtros `proyecto_id`, `estado` (`pendiente` / `en_progreso` / `completada`) y `fecha` (`hoy` = la vista Hoy; `semana` = vencidas y de esta semana). Páginas de 200: si la respuesta trae `siguiente`, se pide el resto con `desde`. Las fechas, en `YYYY-MM-DD` hora de Bogotá.
- `obtener_tarea`: detalle de una tarea (notas, horas, subtareas).

**Escritura** (sin borrado). Cada herramienta usa la misma mutation de Convex que la app y responde con un resumen de lo que hizo; ese resumen es el **criterio de confirmación**:

| Herramienta | Qué hace | Mutation | Confirmación (resumen) |
| --- | --- | --- | --- |
| `crear_proyecto` | Proyecto con nombre y descripción; con `tareas` (título, fecha, prioridad) crea todo en una operación, o nada | `projects.create` / `projects.createWithTasks` | Nombre, descripción, cada tarea con estado y fecha, e id del proyecto. Rechaza nombres repetidos |
| `crear_tarea` | Tarea al final de un proyecto, con fecha y estado opcionales | `tasks.create` + `tasks.updateTask` | Título, estado, fecha, proyecto e id. Si la fecha o el estado no se pudieron guardar, lo avisa |
| `mover_tarea` | Cambia el estado (`pendiente` / `en_progreso` / `completada`) | `tasks.updateTask` | Estado antes → después. En una repetitiva completada, que sigue abierta y su próxima fecha |
| `editar_proyecto` | Cambia nombre y/o descripción de un proyecto por id (descripción vacía la borra) | `projects.updateProject` | Id, y nombre/descripción antes → después. Rechaza nombres repetidos; si nada cambia, lo dice |
| `cambiar_estado_proyecto` | Cambia el estado a `activo` / `en_pausa` / `completado` | `projects.updateProject` | Id, nombre y estado antes → después. Hoy y Esta semana solo muestran proyectos activos |

Las fechas se escriben `YYYY-MM-DD` y se guardan a la medianoche de Bogotá, como el selector de la app. Claude marca estas herramientas como de escritura (`readOnlyHint: false`), así que puede pedir permiso antes de usarlas.

**Qué NO expone:** el código del repo, claves o variables de entorno, datos de otros usuarios (cada conexión ve solo los datos de quien la aprobó), borrar proyectos o tareas (se borran a mano desde la app), ni editar otros campos (título, notas o prioridad de tareas, subtareas, prioridad o fecha de proyectos).

### Cómo se autentica

OAuth 2.1 con **Supabase Auth como servidor de autorización**. No hay secretos propios del MCP:

1. Claude llama a `/api/mcp` sin token y recibe `401` con `resource_metadata`, que apunta a `/.well-known/oauth-protected-resource/api/mcp`. Ahí se indica que los tokens los emite `https://<ref>.supabase.co/auth/v1`.
2. Claude se registra solo en Supabase (registro dinámico) y te manda a `/oauth/consent`. Si no tienes sesión, pasas antes por `/login` y vuelves.
3. Al pulsar **Permitir**, Supabase entrega a Claude un token de tu usuario.
4. El MCP verifica ese JWT (firma ES256 con el JWKS del proyecto, emisor y `aud: authenticated`) y lo reenvía a Convex. Las herramientas usan las mismas consultas que la app (`projects.list`, `tasks.get`) con tu usuario.

### Configurar (una vez, en el panel de Supabase)

1. **Authentication → OAuth Server**: activa el servidor OAuth 2.1, pon **Authorization Path** = `/oauth/consent` y activa **Dynamic client registration**.
2. **Authentication → URL Configuration**: la **Site URL** debe ser el dominio de producción (la pantalla de consentimiento es Site URL + `/oauth/consent`).

No hay que añadir variables en Vercel ni en Convex: el MCP usa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_CONVEX_URL`, que ya existen.

### Conectar en Claude

Settings → Connectors → *Add custom connector*, URL `https://project-manager-web-five.vercel.app/api/mcp`, sin cabeceras. Claude abrirá el inicio de sesión y la pantalla de consentimiento. Luego pregunta, por ejemplo, "¿qué tengo hoy?".

Claude guarda la lista de herramientas de cada conexión: si tras un despliegue no ves una herramienta nueva, abre un chat nuevo o reconecta el conector.

**Revocar el acceso:** en Supabase → Authentication → OAuth Apps, borra el cliente de Claude (o sus autorizaciones). Los tokens ya emitidos caducan con la vida normal de un token de Supabase.

**Si cambia lo que puede hacer el MCP** (por ejemplo, al añadir la escritura), actualiza el texto de `/oauth/consent`, revoca la autorización existente y vuelve a conectar en Claude, para que el acceso nuevo se apruebe de forma explícita.
