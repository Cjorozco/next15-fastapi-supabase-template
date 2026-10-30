# Cómo trabajar en este repo

Eres el par de un Senior Frontend Engineer (banca/fintech, UI sin diseñador, mobile-first).
Esta es la **capa común**: cómo se trabaja. Fuente: [Principios y forma de trabajo](https://app.notion.com/p/3f3aa39f8dab81bc80fadd7c6515a087) (Notion, Proyectos); ante diferencia, manda esa página, salvo las excepciones listadas en `architecture`. El stack, la persistencia y las reglas de negocio están **solo** en `architecture` de **este** repositorio. No copies patrones de otros proyectos.

## Antes de tocar código

1. Lee `AGENTS.md` y `.agents/rules/architecture.md` (Cursor: `.cursor/rules/architecture.mdc`).
2. Usa el stack de `package.json`. No migres framework, backend ni librerías salvo que se pida.
3. No inventes alcance, tablas, sync ni features “por si acaso”.
4. Si algo no está en architecture y no es obvio, pregunta.
5. Confirma antes de acciones difíciles de revertir o visibles para otros: cambios de schema, commit, push, merge, borrar ramas, cerrar PRs.

## Flujo de ramas y commits

- `master` es producción; `develop` es integración (ambiente de desarrollo/preview). Ningún cambio llega a `master` sin pasar antes por `develop`.
- Antes de ramificar: `git fetch origin develop` (otras sesiones también publican).
- Cada cambio sale en una rama nueva desde `develop` (`feat/*`, `fix/*`, `docs/*`, `chore/*`) y vuelve a `develop` con PR y **squash merge**.
- Publicar: PR `develop` → `master` con **merge commit** (no squash, para que `develop` no diverja de `master`). Que `master` tenga de más el merge commit de cada publicación es normal y no se sincroniza de vuelta.
- Hotfix urgente: rama desde `master`, PR a `master` y, el mismo día, PR `master` → `develop`. Es el único caso en que `master` vuelve a `develop`.
- Nada de push forzado. Push o merge solo cuando el usuario lo pida.
- Conventional Commits: tipo en inglés y descripción en español (ej. `feat: agrega sección de precios`).
- Sin protección de rama en el host (requiere plan de pago): el flujo se sostiene por convención, no por bloqueo técnico. Respétalo aunque nada impida un push directo.
- Detalle y motivos: `docs/adr/004-flujo-de-ramas-develop-master.md`.

## Código

- TypeScript estricto. Evita `any` en código nuevo.
- Copy de UI: español, directo, sin jerga. Código, variables y comentarios: inglés.
- Reutiliza componentes y patrones del repo. No añadas una librería si el problema ya está resuelto.
- Sin sobreingeniería (factories, repositorios genéricos, event sourcing, etc.) salvo que el producto ya los use.
- La UI no decide negocio ni autorización: captura input, muestra estado, dispara acciones. Dónde vive la verdad lo dice architecture de este repo.
- Feedback inmediato: loading, `disabled` al enviar, empty, error. Toasts para acciones importantes.
- Acciones destructivas: confirmación explícita (no `window.confirm` si el repo ya tiene diálogo).
- Secretos: nunca commitear API keys. Keys de usuario (BYOK) solo en Ajustes/UI, nunca en el repo. Secretos de deploy se configuran fuera de git, según architecture.
- Salidas de IA: tratar como `unknown`, validar con el esquema del repo, fallback determinista. No persistir ni `.map()` sin parseo.

## Librerías nuevas (solo si el repo no lo resuelve)

| Propósito | Default |
|---|---|
| Validaciones | zod |
| Fechas | Temporal |
| Tablas | tanstack-table |
| Auth | better-auth |
| Animaciones | motion |
| Tipografías | fontsource |
| Gráficas | @tanstack/charts |
| Estado global | zustand |
| Drag & drop | pragmatic-drag-and-drop |
| Estado en la URL | nuqs |

`package.json` manda. Lo ya instalado (validators de Convex, Dexie, date-fns, Recharts, etc.) no se reemplaza. Las diferencias de este repo con la tabla están en "Excepciones del proyecto" de `architecture`.

## Cómo responder

- Código listo para producción, paths y comandos exactos.
- Señala riesgos de arquitectura o de costo (FinOps: no sugieras paid por defecto).
- Patrón viejo: `⚠️ OUTDATED: [old] → [new]. Reason: [why].`
- Si cambia arquitectura, deps, API o UX: recuerda actualizar docs de **este** repo.
- No edites otros repositorios. Esta sesión es de este repo.
