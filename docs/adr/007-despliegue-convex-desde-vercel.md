# ADR 007: Desplegar Convex desde el build de producción de Vercel

- **Estado:** Aceptado
- **Fecha:** 2026-11-22
- **Decisores:** Mantenedor del repositorio

## Contexto

Vercel publica el frontend en cada merge a `master` (ADR 004), pero las funciones de Convex se desplegaban a mano con `npx convex deploy`. Tras publicar el servidor MCP (ADR 006), la query nueva `tasks.get` llegó al código de producción pero no al Convex de producción. `obtener_tarea` y `mover_tarea` fallaron con `Could not find public function for 'tasks:get'` hasta que se desplegó a mano. Cualquier cambio en `frontend/convex/` podía repetirlo.

## Decisión

- `frontend/vercel.json` fija el comando de build: si existe `CONVEX_DEPLOY_KEY`, ejecuta `npx convex deploy --cmd 'npm run build'`; si no, solo `npm run build`.
- `CONVEX_DEPLOY_KEY` es una clave de despliegue de **producción** de Convex. Está solo en el entorno **Production** de Vercel, como variable sensible, y nunca en el repositorio.
- `convex deploy` ejecuta primero el build de Next (con `NEXT_PUBLIC_CONVEX_URL` de la clave) y, solo si termina bien, comprueba tipos y sube funciones, índices y schema.
- Los despliegues Preview no tienen la clave y no tocan Convex.

## Consecuencias

- **Positivas:** frontend y backend se publican juntos y el despliegue manual deja de ser un paso que se olvida. Un error de tipos o de schema en Convex hace fallar el despliegue de Vercel en lugar de publicar un frontend desincronizado.
- **Orden:** el push a Convex ocurre después del build y antes de que Vercel publique, así que durante unos segundos el backend nuevo convive con el frontend anterior. Los cambios de Convex deben seguir siendo compatibles hacia atrás. Las migraciones de datos siguen el flujo widen → migrate → narrow de `docs/deploy.md`, con un `npx convex deploy` manual previo.
- **Dependencia de la variable:** sin `CONVEX_DEPLOY_KEY` en Vercel, producción construye como antes y Convex vuelve a ser manual, sin aviso. Tras cada publicación, el log del build debe mostrar `Deployed Convex functions`.
- **Rotación:** si la clave se filtra, se revoca en el panel de Convex y se crea otra en Vercel.
- **Preview:** sigue sin haber despliegues de Convex por rama; las previews usan el Convex que apunte su `NEXT_PUBLIC_CONVEX_URL`.
