# 📋 Project Manager — Full-Stack SaaS

A full-stack **SaaS project management app** built with Next.js 15, Convex, and Supabase Auth. Features a clean dashboard to track projects and tasks with real-time UI updates.

🔗 **[Live Demo](https://project-manager-web-five.vercel.app)**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-serverless%20backend-000000?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Live](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)

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
# Convex unit tests
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
