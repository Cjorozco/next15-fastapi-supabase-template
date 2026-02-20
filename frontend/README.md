# Personal Finance SaaS - Frontend

Frontend para el SaaS de gestión de proyectos construido con Next.js 15, TypeScript y Tailwind CSS.

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript (Strict mode)
- **Estilos**: Tailwind CSS
- **Componentes UI**: Shadcn/UI
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Iconos**: Lucide React

## Requisitos Previos

- Node.js 18.17 o superior
- Backend corriendo en `http://127.0.0.1:8000`

## Instalación

```bash
# Instalar dependencias
npm install

# Instalar dependencias adicionales
npm install axios @tanstack/react-query lucide-react

# Inicializar Shadcn/UI (si no está configurado)
npx shadcn@latest init

# Agregar componentes de Shadcn
npx shadcn@latest add card checkbox button
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
│   ├── layout.tsx      # Layout principal con QueryProvider
│   └── page.tsx        # Dashboard principal
├── components/         # Componentes React
│   ├── Header.tsx      # Header con búsqueda
│   ├── Sidebar.tsx     # Navegación lateral
│   └── ProjectCard.tsx # Card de proyecto con tareas
├── hooks/              # Custom hooks
│   └── useProjects.ts  # Hook para fetch de proyectos
├── lib/                # Utilidades y configuración
│   ├── api.ts          # Cliente Axios configurado
│   └── query-provider.tsx # Provider de React Query
└── types/              # Definiciones TypeScript
    └── index.ts        # Interfaces (User, Project, Task)
```

## Características

- ✅ Dashboard profesional con diseño limpio tipo banca
- ✅ Sidebar de navegación
- ✅ Header con búsqueda y acciones de usuario
- ✅ Cards de proyectos con:
  - Lista de tareas con checkboxes
  - Barra de progreso
  - Diseño responsive
- ✅ Estados de loading, error y empty
- ✅ Integración con backend FastAPI

## Próximos Pasos

- [ ] Implementar funcionalidad de crear/editar proyectos
- [ ] Agregar funcionalidad de marcar tareas como completadas
- [ ] Implementar autenticación
- [ ] Agregar página de detalle de proyecto
- [ ] Implementar búsqueda en tiempo real
