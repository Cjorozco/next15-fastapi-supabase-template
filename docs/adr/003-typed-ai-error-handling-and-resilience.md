# ADR 003: Manejo Defensivo de Errores Tipados, Timeouts y Fallbacks para Servicios de IA

- **Estado:** Aceptado
- **Fecha:** 2026-09-16
- **Decisores:** Equipo de Desarrollo / Antigravity Pair Programming

---

## Contexto

Las llamadas a modelos de IA (LLMs) como Google Gemini o Groq desde el frontend introducen puntos de fallo inherentes a servicios distribuidos y de inferencia probabilística:
1. **Límites de Cuota / Concurrencia (HTTP 429 / RESOURCE_EXHAUSTED):** El proveedor rechaza la solicitud cuando se sobrepasa el rate limit del plan o la API key.
2. **Autenticación y Permisos (HTTP 401 / 403 / 400 Invalid Key):** Claves BYOK expiradas, mal copiadas o sin permisos.
3. **Latencias Extremas y Bloqueos de Red:** Solicitudes que pueden tardar decenas de segundos bloqueando la UI del usuario sin feedback.
4. **Alucinaciones Estructurales y Parseo Fallido:** Respuestas que no respetan el esquema JSON o no cumplen con las restricciones de negocio.

Si estos errores no se tipan ni se interceptan de manera uniforme, se propagan excepciones genéricas (`Failed to fetch`, `TypeError`, `500 Server Error`) que degradan la experiencia del usuario y hacen imposible la recuperación automática o el fallback manual asistido.

---

## Decisión de Arquitectura

Se establece una **Jerarquía de Excepciones Tipadas de IA** combinada con **Timeouts por `AbortController` (8s)**, **Estrategias de Fallback en Cascada** y **Mapeo Amigable a Nivel de UI**.

### 1. Jerarquía de Excepciones Canónicas (`ai-errors.ts`)

Todas las operaciones de IA heredan de `AIException`, encapsulando un código de error normalizado (`AIErrorCode`), mensaje amigable y el error original:

```typescript
export type AIErrorCode =
  | 'RATE_LIMIT_EXCEEDED'   // 429 / Quota exhausted
  | 'TIMEOUT'               // Excedió umbral (8s)
  | 'NETWORK_ERROR'          // Fallo de conectividad / DNS / CORS
  | 'INVALID_SCHEMA'        // Alucinación / Zod validation error
  | 'INVALID_API_KEY'       // 401 / 403 / 400 Bad API key
  | 'EMPTY_RESPONSE'        // Modelo retornó candidates vacíos
  | 'UNKNOWN';
```

### 2. Control de Timeouts Estrictos con `AbortController`
- Cada invocación al Gateway impone un límite de tiempo por defecto de **8000ms**.
- Si el timer expira antes de recibir respuesta, el `AbortSignal` cancela la conexión HTTP inmediatamente y lanza un `AITimeoutError`.

### 3. Fallback de Modelos en Cascada
- Los adaptadores implementan degradación automática de modelos (ej. `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash` o `llama-3.3-70b` → `llama-3.1-8b`) ante errores de disponibilidad (`404 Not Found` o modelo retirado).

### 4. Degradación Elegante y Fallback Manual en UI
- Si la IA falla por cualquier motivo (429, timeout, error de red o alucinación), la UI:
  1. Notifica al usuario con un `toast.error` descriptivo y no técnico.
  2. Muestra un panel de advertencia contextual con un botón directo de **"Crear proyecto manualmente"**, preservando el contexto del usuario.

---

## Consecuencias

- **Positivas:**
  - Cero crashes de UI o pantallas en blanco ante fallos de proveedores de IA.
  - Trazabilidad y tipado estricto en pruebas unitarias e integración.
  - Resiliencia y experiencia de usuario fluida con alternativas de fallback manual.
- **Compromisos:**
  - Requiere mapear códigos de respuesta HTTP de cada nuevo proveedor al conjunto estándar de `AIException`.
