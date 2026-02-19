# 📋 Project Manager — Full-Stack SaaS

A full-stack **SaaS project management app** built with Next.js 15, FastAPI, and Supabase. Features a clean dashboard to track projects and tasks with real-time UI updates.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.129-009688?style=flat-square&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)

---

## ✨ Features

- 📁 **Project CRUD** — Create, list, and delete projects with duplicate name validation
- ✅ **Task Management** — Add, complete, and delete tasks within each project
- 📊 **Progress Tracking** — Real-time progress bar per project based on completed tasks
- 🔔 **Toast Notifications** — Feedback on every action (create, delete, error)
- 📄 **Project Detail Page** — Full task view at `/projects/[id]`
- 🔗 **Dynamic Navigation** — Active sidebar link based on current route

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| **State & Fetching** | TanStack Query v5 (React Query) |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy (async) |
| **Database** | Supabase (PostgreSQL) via asyncpg |
| **ORM** | SQLAlchemy with async engine |
| **Notifications** | Sonner |

---

## 📁 Project Structure

```
├── frontend/               # Next.js 15 app
│   └── src/
│       ├── app/            # Pages (App Router)
│       │   ├── page.tsx              # Dashboard
│       │   └── projects/
│       │       ├── page.tsx          # Projects list & create
│       │       └── [id]/page.tsx     # Project detail
│       ├── components/     # UI components
│       ├── hooks/          # TanStack Query hooks
│       ├── lib/            # API client (Axios)
│       └── types/          # TypeScript types
│
└── backend/                # FastAPI app
    └── app/
        ├── main.py         # API endpoints
        ├── models.py       # SQLAlchemy models
        ├── schemas.py      # Pydantic schemas
        └── database.py     # DB connection
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- A [Supabase](https://supabase.com) project (free tier works)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your Supabase connection string

# Start the server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

#### Required environment variables (`backend/.env`)

```env
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres
```

> Get this from your Supabase dashboard → Project Settings → Database → Connection string (use the **transaction pooler** URI and add `?sslmode=require`).
> Also add your JWT Secret (Project Settings → API → JWT Settings):
> `SUPABASE_JWT_SECRET=...`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your backend URL

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

#### Required environment variables (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/{id}/projects/` | List user's projects with tasks |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/{id}` | Get single project with tasks |
| `DELETE` | `/projects/{id}` | Delete a project |
| `POST` | `/projects/{id}/tasks/` | Create a task |
| `PATCH` | `/tasks/{id}` | Toggle task completion |
| `DELETE` | `/tasks/{id}` | Delete a task |

---

## 🗺️ Roadmap

- [x] **Supabase Auth** (login / register / middleware)
- [ ] Edit project name and description
- [ ] Task due dates and priorities
- [ ] Deployment (Vercel + Render)

---

## 📄 License

MIT — feel free to use this as a template for your own projects.
