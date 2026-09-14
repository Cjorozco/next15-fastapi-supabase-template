<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Ecosistemas Platform — guía para agentes

Documentación de dominio y arquitectura: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Reglas del Proyecto

- **Antigravity (Nativo en `.agents/rules/`):**
  - Arquitectura y límites de dominio: [`.agents/rules/architecture.md`](./.agents/rules/architecture.md)
  - Convenciones y seguridad de Convex: [`.agents/rules/convex-conventions.md`](./.agents/rules/convex-conventions.md)
  - Heurísticas UX y frontend: [`.agents/rules/ux-principles.md`](./.agents/rules/ux-principles.md)
- **Cursor (Alternativa en `.cursor/rules/`):**
  - [`.cursor/rules/architecture.mdc`](./.cursor/rules/architecture.mdc), [`.cursor/rules/convex-conventions.mdc`](./.cursor/rules/convex-conventions.mdc), [`.cursor/rules/ux-principles.mdc`](./.cursor/rules/ux-principles.mdc).

## Stack Principal
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Backend & DB:** Convex 1.21.0.
- **Auth:** Convex Auth (`@convex-dev/auth`).
- **Filosofía:** UI tonta / backend fuerte, mobile-first para operadores de campo, cálculos financieros sellados en Convex.

## Preferencias de librerías (default al elegir algo nuevo)

Esta lista es el default al elegir una librería **NUEVA** para algo que el
proyecto aún no resuelve. No reemplaza ni cuestiona lo que ya está en
`package.json` y funcionando.

| Propósito | Librería preferida |
|---|---|
| Validaciones | zod |
| Fechas | Temporal |
| Tablas | tanstack-table |
| Auth | better-auth |
| Animaciones | motion |
| Tipografías | fontsource |
| Gráficas | chart.js |
| Estado global | zustand |
| Drag & drop | pragmatic-drag-and-drop |
| Estado en la URL | nuqs |

**Nota:** Donde ya hay estándar establecido en este proyecto (validators de
Convex en vez de Zod, hooks de Convex en vez de Zustand/estado externo), esta
lista de preferencia nueva **no** los reemplaza — aplica solo cuando se
introduzca algo que Convex no resuelve ya.
