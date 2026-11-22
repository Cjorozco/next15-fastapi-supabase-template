# Guía de Despliegue — Project Manager SaaS

Esta guía detalla el procedimiento para desplegar la aplicación en ambientes de **Staging / Preview** y **Producción**.

---

## 1. Arquitectura de Despliegue

- **Frontend:** Vercel (Next.js 16 con Turbopack)
- **Backend & Base de Datos:** Convex Cloud
- **Autenticación:** Supabase Auth (con JWKS público)

---

## 2. Variables de Entorno Requeridas

### En Vercel (Frontend)

Configurar en el panel de Vercel (**Project Settings > Environment Variables**):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anónima pública de Supabase | `eyJhbGciOi...` |
| `NEXT_PUBLIC_CONVEX_URL` | URL de tu despliegue de Convex (**sin slash final**) | `https://happy-otter-123.convex.cloud` |

> [!CAUTION]
> **Importante:** La variable `NEXT_PUBLIC_CONVEX_URL` **no debe tener barra inclinada (`/`) al final**. Si tiene un trailing slash, la URL del WebSocket fallará con un doble slash (`wss://...convex.cloud//api/...`) cerrando la conexión con código 1006.

### En Convex Cloud (Backend)

Configurar en el panel de Convex (**Project Settings > Environment Variables**):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SUPABASE_URL` | URL base de Supabase para validar JWKS | `https://xyzcompany.supabase.co` |

---

## 3. Requisito de Firma de Tokens en Supabase (ES256)

Para que Convex pueda verificar de forma autónoma los tokens JWT emitidos por Supabase mediante su endpoint de claves públicas (`.well-known/jwks.json`), el algoritmo de firma del proyecto en Supabase debe ser **ES256**:

1. En el panel de Supabase, ir a **Project Settings > Authentication > JWT Settings**.
2. Asegurar que las llaves asimétricas (Signing Keys) estén activadas en formato **ECC (Elliptic Curve) / ES256**.
3. Más detalles en [`CONVEX_MIGRATION.md`](../CONVEX_MIGRATION.md).

---

## 4. Proceso de Despliegue

### Paso 1: Desplegar Backend a Convex

```bash
cd frontend
# Para ambiente de desarrollo local
npx convex dev

# Despliegue manual a producción (plan B: normalmente lo hace Vercel, ver abajo)
npx convex deploy
```

#### Despliegue automático desde Vercel

`frontend/vercel.json` define el comando de build:

```sh
if [ -n "$CONVEX_DEPLOY_KEY" ]; then npx convex deploy --cmd 'npm run build'; else npm run build; fi
```

- **Producción:** con `CONVEX_DEPLOY_KEY` definida, `convex deploy` ejecuta primero `npm run build` (con `NEXT_PUBLIC_CONVEX_URL` del despliegue de la clave) y, solo si termina bien, comprueba tipos y sube funciones, índices y schema a Convex. Si el build o el push fallan, el despliegue de Vercel falla y la web anterior sigue publicada.
- **Preview** (ramas y PRs): sin la clave, solo `npm run build`. Ninguna rama despliega al Convex de producción.
- **Configurar una vez:** en el panel de Convex, despliegue de **producción** → Settings → *Generate Production Deploy Key*. En Vercel → Settings → Environment Variables, `CONVEX_DEPLOY_KEY` solo en **Production**, como variable sensible. La clave nunca va al repositorio.
- **Comprobar:** el log del build de Vercel debe terminar con `Deployed Convex functions to [REDACTED]`. Vercel tapa la URL porque contiene el nombre del despliegue, que también está dentro de la clave sensible; la línea basta para confirmar el despliegue. Si falta, la variable no llegó al build y Convex no se desplegó.

Motivo: con el despliegue manual, el frontend llegó a producción con funciones de Convex que no existían (`tasks.get`, noviembre de 2026). Ver ADR 007.

#### Migraciones de datos

Cuando un cambio de schema necesita reescribir datos (p. ej. `status` de tareas), usa *widen → migrate → narrow*: despliega primero el schema ampliado, ejecuta la migración y solo después quita lo antiguo.

```bash
npx convex run migrations:backfillTaskFields --prod        # idempotente
npx convex run migrations:countTasksPendingBackfill --prod # debe devolver pending: 0
```

Orden recomendado cuando hay migración: `npx convex deploy` manual del schema ampliado → migración → merge del PR a `master` (que vuelve a desplegar Convex desde Vercel con el mismo código), para que el frontend nuevo nunca llame a funciones que aún no existen. Sin migración, basta con el merge.

### Paso 2: Desplegar Frontend a Vercel

El repositorio está vinculado automáticamente a Vercel. Flujo de ramas: `.agents/rules/working-style.md` y ADR 004.

- **Preview:** cada rama y PR (incluida `develop`) genera un despliegue Preview.
- **Producción:** solo `master`, y únicamente mediante el PR `develop` → `master` (merge commit). No se hace push directo a `master`.

Configuración requerida en Vercel (Project Settings > Git): Production Branch = `master`. Las variables de entorno de Preview deben apuntar a un Convex y un Supabase de desarrollo, no a producción.

### Paso 3: Verificación Post-Deploy

1. Abrir la URL de producción o de vista previa de Vercel.
2. Comprobar que la consola del navegador no presente errores de WebSocket o cookies.
3. Iniciar sesión y validar la carga en tiempo real del dashboard y los proyectos.
4. Comprobar cabeceras: `curl -I https://<url>/login` debe incluir `Content-Security-Policy`, `X-Content-Type-Options` y `X-Frame-Options`.

> No hay pruebas E2E (Cypress se retiró). La CI (`.github/workflows/ci.yml`) corre lint, `tsc`, Vitest, build y `npm audit --omit=dev`.

---

## 5. Demo (opcional)

| Dónde | Variables |
|---|---|
| Vercel | `NEXT_PUBLIC_DEMO_EMAIL`, `DEMO_EMAIL`, `DEMO_PASSWORD` (solo servidor) |
| Convex | `DEMO_EMAIL`, `DEMO_TOKEN_IDENTIFIER` |

Sin `DEMO_EMAIL`/`DEMO_PASSWORD`, `/api/demo-login` responde 404. Para apagar la demo en producción, elimina esas variables y redespliega.

---

## 6. Rollback

- **Frontend:** en Vercel, *Deployments* → despliegue anterior estable → *Promote to Production*.
- **Backend:** Convex no revierte solo; redesplegar el commit previo con `npx convex deploy`. Para datos, restaurar desde un backup de Convex (*Settings > Backups*); la restauración aún no se ha probado.
- Respetar el orden `convex deploy` → migración → merge a `master` también al volver atrás.
