# Regla: Límite de Cero Confianza para Salidas de IA (Validación con Zod)

## Principio Esencial
**Las salidas de modelos de lenguaje (LLMs / Agentes) son entradas externas no confiables.**
Ninguna respuesta de IA debe alcanzar una mutación de base de datos (`internalMutation` en Convex) ni mutar el estado reactivo de React sin haber sido interceptada y validada estrictamente con **Zod**.

---

## Directrices de Implementación

1. **Intercepción y Sanitización de Bloques de Código:**
   - Usar `safeParseAIResponse` de `shared/lib/ai/safe-ai-parser.ts`.
   - Limpia automáticamente envolturas tipo ` ```json ... ``` ` y texto conversacional previo/posterior.

2. **Diseño de Esquemas Defensivos:**
   - **Campos desconocidos:** Zod descarta automáticamente por defecto (`.strip()`) cualquier propiedad alucinada o peligrosa enviada por el modelo.
   - **Coerción:** Usar `z.coerce.number()` o `z.coerce.boolean()` cuando el modelo pueda devolver números como cadenas.
   - **Defaults seguros:** Establecer `.default([])` en arrays o `.default(valor)` en campos no esenciales.
   - **Límites:** Delimitar cadenas con `.min()` y `.max()`.

3. **Prohibición de `.parse()` Desprotegido:**
   - Nunca utilizar `schema.parse()` directo sobre salidas de IA, ya que arroja excepciones fatales no controladas.
   - Utilizar siempre `safeParseAIResponse()` o `schema.safeParse()`.

4. **Flujo Convex (Backend Seguro):**
   ```text
   LLM API (Gemini/OpenAI) ──> Convex Action ──> safeParseAIResponse(schema) ──> internalMutation ──> Convex DB
   ```
   - La llamada HTTP al proveedor se realiza en una `action`.
   - Se valida dentro de la `action`.
   - Solo los datos parseados con éxito se pasan a `internalMutation`.

5. **Degradación Elegante en UI:**
   - Utilizar `parseAIWithFallback(schema, rawResponse, fallback)` para componentes donde una falla de la IA deba resolverse mostrando un estado por defecto sin romper la pantalla ni arrojar errores en blanco.

6. **Ciclo de Autocorrección:**
   - Utilizar `formatZodIssuesForPrompt(error)` para reinyectar los errores exactos de validación en el prompt de reintento del LLM.
