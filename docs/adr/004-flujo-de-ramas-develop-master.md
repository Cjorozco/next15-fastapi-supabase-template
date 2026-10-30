# ADR 004: Flujo de ramas `develop` → `master`

- **Estado:** Aceptado
- **Fecha:** 2026-10-30
- **Decisores:** Mantenedor del repositorio

## Contexto

El repositorio trabajaba con una sola rama (`master`) y despliegue directo: `docs/deploy.md` indicaba `git push origin master` para publicar, y `docs/HANDOFF.md` y la tabla de excepciones de `architecture` decían "solo existe `master`". En la práctica ya existía `develop` y se había publicado con un PR `develop` → `master` (merge commit). Varias sesiones de agentes trabajan en paralelo y publican en el mismo repo, por lo que hacía falta un flujo explícito y una sola fuente de verdad.

## Decisión

- `master` es producción; `develop` es integración (ambiente de desarrollo/preview). Ningún cambio llega a `master` sin pasar antes por `develop`.
- Cada cambio sale en una rama nueva desde `develop` y vuelve a `develop` con PR y **squash merge**.
- Publicar: PR `develop` → `master` con **merge commit** (no squash), para que `develop` no diverja de `master`.
- Hotfix urgente: rama desde `master`, PR a `master` y, el mismo día, PR `master` → `develop`. Es el único caso en que `master` vuelve a `develop`. Que `master` tenga de más el merge commit de cada publicación es normal y no se sincroniza de vuelta.
- Antes de ramificar: `git fetch origin develop`. Sin push forzado. Push o merge solo cuando lo pida el mantenedor.
- Conventional Commits: tipo en inglés y descripción en español.
- CI corre en PR hacia `develop` y `master` y en push a ambas.
- La regla vive en un solo lugar: sección "Flujo de ramas y commits" de `.agents/rules/working-style.md` (con sus copias sincronizadas en `frontend/.agents/rules/`, `.cursor/rules/` y `frontend/.cursor/rules/`). El resto de archivos la referencian.

## Consecuencias

- **Positivas:** todo cambio pasa por CI y revisión antes de producción; `develop` no diverge de `master`; el flujo es el mismo para humanos y agentes.
- **Costo:** un PR extra por publicación y mantener cuatro copias de la regla a mano (decisión previa, ver `docs/HANDOFF.md`).
- **Fuera del repo (lo aplica el mantenedor):**
  - Vercel: Production Branch = `master`; `develop` y las demás ramas generan deploys Preview. Las variables de Preview deberían apuntar a Convex y Supabase de desarrollo, no a producción.
  - Convex: `npx convex deploy` sigue siendo manual y va a producción; no hay despliegue automático por rama.
  - GitHub: proteger `master` y `develop` (PR obligatorio, check `check` de CI, sin push forzado).
- **Enmiendas:** ningún ADR anterior trataba el flujo de ramas, por lo que no hay enmienda que añadir.

## Enmiendas

### 2026-10-30: sin protección de rama en el host

La protección de rama de GitHub no se activará porque requiere un plan de pago en repositorios privados de cuentas gratuitas. Esta enmienda sustituye la línea de Consecuencias que da por pendiente "GitHub: proteger `master` y `develop` (PR obligatorio, check `check` de CI, sin push forzado)"; el texto original se conserva como registro histórico.

El flujo se sostiene por convención, no por bloqueo técnico:
- Las reglas de los agentes (`.agents/rules/working-style.md`).
- "Push o merge solo cuando se pida" y sin push forzado.
- El flujo de dos PR: cambio → `develop` (squash) y `develop` → `master` (merge commit).

Consecuencia: nada impide técnicamente un push directo a `master` o fusionar un PR con la CI en rojo; la disciplina depende de seguir estas reglas.
