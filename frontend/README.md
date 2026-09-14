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
