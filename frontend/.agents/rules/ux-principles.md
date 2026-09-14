# Principios Universales de UX y Diseño Frontend

> **Ámbito:** Frontend (`src/app/**/*.{tsx,jsx,ts}`, `shared/**/*.{tsx,jsx,ts}`, `domains/**/*.{tsx,jsx,ts}`).
> **Descripción:** Heurísticas de usabilidad, diseño responsivo y reglas de implementación para React, Next.js y TypeScript en Project Manager SaaS.

---

## 1. Gestión de Complejidad y Claridad (Ley de Tesler & Ley de Hick)

- **Abstracción Técnica:** Manejar el estado y transformaciones de datos limpiamente para mantener la interfaz despejada.
- **Límites de Decisión:** Mantener las vistas focalizadas en las tareas clave (crear proyecto, gestionar tareas, visualizar progreso).
- **Lenguaje UI:** Mensajes, títulos y etiquetas directos, claros y accionables, sin tecnicismos hacia el usuario final.

---

## 2. Consistencia y Patrones (Ley de Jakob)

- **Reutilización Estricta:** Construir componentes reutilizables a partir del kit base shadcn/ui y Tailwind CSS en `shared/components/ui/`.
- **Familiaridad:** Patrones estándar de tableros de gestión (cards de proyecto, barra de progreso por porcentaje, listas de tareas reordenables).
- **Separación de Dominios:**
  - Componentes genéricos en `shared/components/` (ui, layout).
  - Componentes de proyecto en `domains/projects/components/`.
  - Componentes de dashboard y métricas en `domains/dashboard/components/`.

---

## 3. Flexibilidad de Entradas y Prevención de Errores (Ley de Postel)

- **Sanitización en Cliente:** Limpieza básica de strings (trimming) y validación inmediata antes de enviar mutaciones.
- **Manejo de Errores Amigable:** Capturar errores de Convex o Supabase y mostrarlos al usuario mediante `mapErrorToUserMessage()` de `shared/lib/userFacingError.ts`.
- **Confirmación en Acciones Destructivas:** Diálogos o confirmaciones claras antes de eliminar proyectos o tareas irreversibles.

---

## 4. Sistemas de Feedback (Peak-End Rule)

- **Visibilidad del Estado:** Estados de carga claros con `Loader2`, indicadores deshabilitados durante mutaciones pendientes (`isPending`), y skeletons donde aplique.
- **Notificaciones con Toast:** Notificaciones visuales con Sonner para confirmar éxitos ("Proyecto creado", "Tarea completada") o informar fallos.
- **Drag & Drop Responsivo:** Feedback visual durante el arrastre de tareas con `@dnd-kit`.

---

## 5. Accesibilidad y Responsividad

- **Diseño Responsivo:** Soporte fluido tanto para escritorio como pantallas móviles (sidebar colapsable o adaptable, cards flexibles).
- **Accesibilidad (A11y):** Elementos interactivos con foco visible, contraste adecuado, `aria-label` en botones con solo icono, y navegación por teclado en modales y tareas.
