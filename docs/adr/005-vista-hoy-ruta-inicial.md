# ADR 005: Vista "Hoy" como ruta inicial y zona horaria America/Bogota

- **Estado:** Aceptado
- **Fecha:** 2026-11-04
- **Decisores:** Mantenedor del repositorio

## Contexto

La primera pantalla del día debe responder "¿qué hago hoy?" sin ruido. El Dashboard resume proyectos y métricas, y "Esta semana" (`/week`) lista todo lo pendiente (vencidas, semana, más adelante, sin planificar, sin límite). Ninguna de las dos es una lista corta y accionable para abrir cada mañana, a menudo desde el celular.

Además, "hoy" depende de la zona horaria. Vercel ejecuta en UTC, y a las 19:00 en Bogotá (UTC-5) ya es "mañana" en UTC.

## Decisión

### `/hoy` es la ruta inicial

- Nueva vista `/hoy`; `/` redirige a `/hoy` (`src/app/(dashboard)/page.tsx`).
- El Dashboard pasa a `/dashboard`. El menú lateral tiene "Hoy" como primer ítem y "Dashboard" apunta a `/dashboard`.
- Los redirects tras el login (`proxy.ts`, `login/page.tsx`, `AuthContext.tsx`) van directo a `/hoy`, sin pasar por el redirect de `/`.
- Una tarea aparece si su proyecto está Activo, la tarea está Pendiente o En progreso y además cumple una: su fecha límite es hoy o ya pasó; es diaria y su ciclo ya arrancó; o es semanal y le toca hoy. Las tareas sin fecha siguen solo en `/week`.
- Sin cambios en el esquema de Convex ni en las mutations: completar usa `tasks.update` y `tasks.toggleSubtask`, igual que el resto de la app. La lógica es pura y vive en `domains/tasks/lib/today.ts`; reutiliza `PRIORITY_RANK` de `week.ts`.
- Las repetitivas guardan en `dueDate` la fecha de su próxima ocurrencia (no hay campo de fecha de inicio ni de día de la semana). Por eso "ya arrancó" y "le toca hoy" se evalúan con `dueDate`: diaria sin fecha o con fecha de hoy o anterior; semanal con fecha de hoy o anterior, y nunca sin fecha. Una semanal completada hoy se reabre con fecha dentro de 7 días y no reaparece.
- Al completarse, una repetitiva se reabre con la fecha siguiente y las subtareas sin marcar (`reopenPatchIfRecurring`), así que sale de la lista. El contador "X de Y hechas" recuerda en la sesión de la vista lo que se marcó y ya no está pendiente; no sobrevive a una recarga.

### Zona horaria

- `APP_TIME_ZONE = 'America/Bogota'` (`domains/tasks/lib/timezone.ts`). El día de un timestamp se obtiene con `Intl.DateTimeFormat` y esa zona (`dayKey`, clave `YYYY-MM-DD`) y las claves se comparan como texto.
- La vista es un componente de cliente que calcula con datos de Convex: no hay cálculo de "hoy" en el servidor de Vercel que pueda desfasarse. Aun así la zona se fija de forma explícita para no depender de la del dispositivo.
- El encabezado ("Hoy — miércoles 4 de noviembre") usa la misma zona.

## Consecuencias

- **Positivas:** una pantalla corta y accionable; sin nueva tabla, campo ni mutation; "hoy" es el mismo en Vercel, en el navegador y en el celular.
- **Costo:** `/week` y las badges de fecha siguen usando la zona del dispositivo (`startOfDay`), por lo que fuera de Bogotá ambas vistas podrían discrepar cerca de la medianoche. No se unificó para no cambiar `/week`.
- **Límite:** el contador no cuenta tareas completadas antes de abrir la vista. Contarlas de forma persistente requeriría guardar la fecha de la última finalización (cambio de esquema), que no se hizo.
- **Enlaces a `/`:** quien tenga `/` guardado llega a `/hoy` por el redirect. El Dashboard se abre en `/dashboard`.

## Enmiendas

### 2026-11-04: repetitivas con subtareas conservan el progreso

Esta enmienda sustituye la frase de "Decisión" que dice que, al completarse, una repetitiva se reabre con las subtareas sin marcar; el texto original se conserva como registro histórico. Para una repetitiva **con subtareas**:

- Marcar una subtarea cuenta como el trabajo del día: la tarea queda hecha por hoy (su fecha pasa a la siguiente ocurrencia) y las subtareas marcadas **se conservan**, de modo que mañana la "siguiente subtarea" es la que sigue.
- Se pueden marcar varias subtareas el mismo día; la fecha avanza una sola vez (`isDoneForNow` en `convex/lib/taskFields.ts`).
- Marcar la tarea directamente significa "eso fue todo por hoy": avanza la fecha y deja las subtareas como están, hayan o no avanzado.
- Completar la última subtarea **termina la tarea** (es un plan que llegó a su fin): queda Completada, con todas las subtareas marcadas, y no vuelve sola. Al hacerlo la app pregunta "¿Quieres reiniciarla?": "Reiniciar" desmarca las subtareas y la deja de nuevo pendiente en su próxima fecha, y "No" la deja terminada.
- Las repetitivas **sin subtareas** no cambian.
- Sin cambios de esquema.
