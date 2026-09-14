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

# Para desplegar a producción
npx convex deploy
```

### Paso 2: Desplegar Frontend a Vercel

El repositorio está vinculado automáticamente a Vercel. Un `git push` a la rama principal (`master` / `main`) dispara un despliegue automático:

```bash
git push origin master
```

### Paso 3: Verificación Post-Deploy

1. Abrir la URL de producción o de vista previa de Vercel.
2. Comprobar que la consola del navegador no presente errores de WebSocket o cookies.
3. Iniciar sesión y validar la carga en tiempo real del dashboard y los proyectos.
4. Ejecutar la suite de tests E2E si corresponde:
   ```bash
   cd frontend
   npx cypress run --e2e
   ```
