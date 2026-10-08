# Regla: Límite de Cero Confianza para Salidas de IA (Validación con Zod)

## Principio Esencial
**Las salidas de modelos de lenguaje (LLMs / Agentes) son entradas externas no confiables.**
Ninguna respuesta de IA debe alcanzar una mutación de base de datos (Convex) ni mutar el estado reactivo de React sin haber sido interceptada y validada estrictamente con **Zod**.

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

4. **Flujo real (BYOK en el cliente):**
   ```text
   LLM API (Gemini/Groq) ──> navegador (ai-gateway) ──> safeParseAIResponse(schema) ──> mutation de Convex ──> Convex DB
   ```
   - La llamada al proveedor se hace desde el navegador con la API key del usuario (`localStorage`, `shared/lib/ai/ai-storage.ts`); nunca pasa por el backend.
   - Se valida en el cliente con los esquemas de `domains/projects/schemas/`.
   - Solo los datos parseados con éxito se envían a la mutation (`projects.createWithTasks`, `projects.applyAiRefinement`).
   - La mutation es pública, así que **revalida autenticación y propiedad del proyecto** y vuelve a acotar el payload: el cliente no es de confianza.
   - Si algún día la llamada pasa a una `action`, el flujo sería action → `internalMutation`.

5. **Degradación Elegante en UI:**
   - Utilizar `parseAIWithFallback(schema, rawResponse, fallback)` para componentes donde una falla de la IA deba resolverse mostrando un estado por defecto sin romper la pantalla ni arrojar errores en blanco.

6. **Ciclo de Autocorrección:**
   - Utilizar `formatZodIssuesForPrompt(error)` para reinyectar los errores exactos de validación en el prompt de reintento del LLM.
