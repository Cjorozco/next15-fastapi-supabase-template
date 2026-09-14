# ADR 001: Conservación de Supabase Auth en lugar de Convex Auth

- **Estado:** Aceptado
- **Fecha:** 2026-09-14
- **Decisores:** Equipo de Desarrollo / Antigravity Pair Programming

---

## Contexto

El blueprint estándar de arquitectura sugiere el uso de `@convex-dev/auth` (Convex Auth) como solución predeterminada de autenticación en arquitecturas basadas en Convex.

Sin embargo, este proyecto cuenta con **Supabase Auth** ya implementado, probado exhaustivamente y operando de manera estable en producción en Vercel ([project-manager-web-five.vercel.app](https://project-manager-web-five.vercel.app)). La integración utiliza llaves de firma asimétricas **ES256** en Supabase, permitiendo que Convex valide criptográficamente los JWTs entrantes a través del endpoint público JWKS de Supabase (`.well-known/jwks.json`).

---

## Opciones Evaluadas

### Opción A: Migrar a Convex Auth (`@convex-dev/auth`)
- **Ventajas:**
  - Reducción de una dependencia de servicio externa (Supabase).
  - Unificación completa de auth y datos en un solo panel de control de Convex.
- **Desventajas:**
  - Riesgo alto de interrupción en producción.
  - Necesidad de migrar credenciales o forzar reseteo de contraseñas de usuarios existentes.
  - Reescritura completa de componentes de login, registro, proxy de middleware y sincronización de sesiones.
  - Esfuerzo de desarrollo significativo sin valor añadido directo a las funcionalidades de negocio.

### Opción B: Conservar Supabase Auth con puente JWT ES256 (Opción Elegida)
- **Ventajas:**
  - Cero riesgo para los usuarios activos en producción.
  - Integración nativa y estándar: Convex soporta formalmente proveedores OIDC/JWT externos mediante `auth.config.ts`.
  - El middleware (`src/proxy.ts`) utiliza `@supabase/ssr` para refrescar cookies de forma robusta a nivel de red.
  - Flexibilidad futura para incorporar características del ecosistema de Supabase (ej. almacenamiento o autenticaciones sociales adicionales).
- **Desventajas:**
  - Mantener dos servicios activos (Supabase para auth, Convex para backend y datos).

---

## Decisión

Se decide **conservar Supabase Auth** como proveedor de identidad, manteniendo la validación de tokens JWT mediante ES256 en Convex.

---

## Consecuencias

- `auth.config.ts` de Convex continuará configurado con el dominio JWKS de Supabase:
  ```typescript
  export default {
    providers: [
      {
        domain: process.env.SUPABASE_URL,
        applicationID: 'convex',
      },
    ],
  };
  ```
- La sincronización del usuario en la base de datos de Convex continuará a través de la mutación `users.store`.
- Las variables de entorno de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`) se mantienen requeridas para despliegues.
