# 📋 Project Manager — Full-Stack SaaS

A full-stack **SaaS project management application** built with Next.js 15, Convex, and Supabase Auth. Features a clean, high-performance dashboard to track projects and tasks with real-time UI updates.

> 🚀 **AI-Native Product Engineering**: Este software fue diseñado, arquitectado y desarrollado bajo un modelo de ingeniería asistida por IA, combinando visión de producto, rigor arquitectónico y co-creación iterativa humano-agente.

🔗 **[Live Demo](https://project-manager-web-five.vercel.app)**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-serverless%20backend-000000?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![AI-Native](https://img.shields.io/badge/Engineering-AI--Native-7928CA?style=flat-square)
![Live](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)

---

## 🤖 Metodología de Desarrollo

Este proyecto fue construido y evolucionado bajo un enfoque de **Ingeniería de Producto AI-Native (AI-Native Product Engineering)**:

1. **Rol Humano (Product Owner, Arquitecto y Orquestador)**: Actué como Product Owner, Arquitecto de Software y Orquestador, guiando iterativamente al agente de IA para transformar requerimientos de negocio y casos de uso en especificaciones técnicas de alto nivel y código de producción robusto.
2. **Principios de Arquitectura de Software**:
   - **Diseño modular por dominios**: Separación estricta de dominios (proyectos, tareas, autenticación, usuarios).
   - **Tipado estricto end-to-end**: Garantía de coherencia y validación de tipos con TypeScript tanto en cliente como en servidor.
   - **Separación de responsabilidades (*"UI tonta, backend fuerte"* / *Dumb UI, Strong Backend*)**: La lógica de negocio, validaciones de seguridad, integridad relacional y autorización residen en el backend (Convex / Supabase), permitiendo que la interfaz de usuario permanezca declarativa, predecible y centrada en la experiencia visual.
3. **Co-Creación Acelerada y Calidad Rigurosa**: La co-creación con agentes de IA permitió acelerar drásticamente los ciclos de iteración y entrega (incluyendo migraciones arquitectónicas y optimizaciones reactivas), manteniendo estándares estrictos de pruebas automatizadas (**Vitest** y **Cypress**) y garantizando la resiliencia y mantenibilidad del sistema.

---

## ✨ Features

- 📁 **Project CRUD** — Create, list, and delete projects with duplicate name validation
- ✅ **Task Management** — Add, complete, and delete tasks within each project
- 🔀 **Drag-and-Drop Reordering** — Re-order tasks with `@dnd-kit`
- 📊 **Progress Tracking** — Real-time progress bar per project based on completed tasks
- 🔔 **Toast Notifications** — Feedback on every action (create, delete, error)
- 📄 **Project Detail Page** — Full task view at `/projects/[id]`
- 🔗 **Dynamic Navigation** — Active sidebar link based on current route
- ⚡ **Real-time Updates** — Convex live queries update the UI instantly

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Convex (serverless functions + managed DB) |
| **Auth** | Supabase Auth (JWT → Convex verification) |
| **Database** | Convex (replaces Supabase Postgres for app data) |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |
| **Notifications** | Sonner |

> **Note:** The original FastAPI backend (`backend/`) is preserved as a reference for the previous architecture. It is no longer used.

---

## 📁 Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   │   ├── page.tsx              # Dashboard
│   │   │   └── projects/
│   │   │       ├── page.tsx          # Projects list & create
│   │   │       └── [id]/page.tsx     # Project detail
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Convex hooks (useProjects, useTasks)
│   │   ├── lib/              # Supabase client, Convex provider
│   │   └── types/            # TypeScript types
│   ├── convex/               # Convex backend (functions, schema, auth)
│   │   ├── auth.config.ts    # Supabase JWT verification
│   │   ├── schema.ts         # DB schema (users, projects, tasks)
│   │   ├── projects.ts       # Project CRUD + cleanupAll
│   │   ├── tasks.ts          # Task CRUD + reorder
│   │   ├── users.ts          # Auth user sync
│   │   └── lib/auth.ts       # Auth helpers
│   └── cypress/              # E2E tests
└── backend/                  # FastAPI (legacy, preserved for reference)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (for auth only)
- A [Convex](https://convex.dev) account

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Supabase and Convex URLs
```

#### Required environment variables (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

### Convex Setup

```bash
cd frontend

# Start Convex dev server (creates a local deployment)
npx convex dev
```

Set the Supabase URL in Convex:
```bash
npx convex env set SUPABASE_URL https://your-project.supabase.co
```

### Run Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🧪 Testing

```bash
# Unit & integration tests (Vitest)
npm run test

# Convex backend tests
npx convex test

# Cypress E2E tests (production)
npx cypress run --e2e
```

---

## 🗺️ Roadmap

- [x] **Supabase Auth** (login / register / middleware)
- [x] **Convex migration** (backend, schema, functions)
- [x] **Real-time updates** via Convex live queries
- [ ] Edit project name and description
- [ ] Task due dates and priorities
- [ ] Data migration from Supabase Postgres to Convex

---

## 📄 License

MIT — feel free to use this as a template for your own projects.
