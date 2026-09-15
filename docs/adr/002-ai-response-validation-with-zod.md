# ADR 002: Intercepción Defensiva y Validación con Zod para Respuestas de IA (Zero-Trust AI Boundary)

- **Estado:** Aceptado
- **Fecha:** 2026-09-15
- **Decisores:** Equipo de Desarrollo / Antigravity Pair Programming

---

## Contexto

A medida que el proyecto evolucione hacia la integración de capacidades de Inteligencia Artificial (ej. generación de tareas, resúmenes, estimaciones, sugerencias automáticas de proyectos mediante LLMs como Gemini o OpenAI), surge una necesidad crítica de arquitectura:

**Las salidas de los modelos de IA son probabilísticas y no confiables por naturaleza.**
Entre los fallos comunes de las respuestas de LLM se encuentran:
1. **Alucinación de campos:** Inclusión de propiedades no existentes o tipos inesperados.
2. **Artefactos de formato:** Respuestas envueltas en bloques de Markdown (\`\`\`json ... \`\`\`) o con texto conversacional adicional.
3. **Inconsistencia de tipos:** Devolver números como strings (ej. \`"5"\` en lugar de \`5\`) o booleanos inconsistentes.
4. **Respuestas truncadas o corruptas:** Fallos por límites de tokens o errores de red de los proveedores.

Permitir que una respuesta cruda de IA llegue directamente a la base de datos (Convex) o al estado reactivo del frontend (React 19) ocasionaría:
- **Corrupción de base de datos:** Violación de esquemas o inserción de propiedades basura.
- **Crashes en la UI:** Excepciones de tipo \`TypeError: Cannot read properties of undefined\` o fallos en componentes visuales.
- **Inestabilidad del sistema:** Incapacidad de recuperarse de errores de inferencia del modelo.

---

## Decisión de Arquitectura

Se establece el principio de **"Límite de Cero Confianza para la IA" (Zero-Trust AI Boundary)** respaldado por validación e intercepción estricta mediante **Zod**.

Toda integración futura con IA debe adherirse a las siguientes 4 reglas fundamentales:

### 1. Intercepción y Sanitización de Bloques Markdown
Antes de validar la estructura, el contenido en texto generado por el LLM debe pasar por un proceso de sanitización (`extractJsonFromAIResponse`) que:
- Elimina bloques de formato Markdown (` ```json ... ``` `).
- Extrae la estructura JSON más externa descartando texto introductorio o de despedida.

### 2. Validación Defensiva con `schema.safeParse()`
- **Queda estrictamente prohibido usar `.parse()` desprotegido** sobre respuestas de IA.
- Se debe utilizar siempre `safeParseAIResponse(schema, rawResponse)` o `schema.safeParse()`.
- Los esquemas Zod deben utilizar:
  - `.strip()` (comportamiento por defecto de Zod para descartar campos extra o alucinados).
  - Coerción segura (`z.coerce.number()`, `z.coerce.boolean()`) cuando aplique.
  - Valores predeterminados (`.default(...)`) para propiedades opcionales o propensas a omisión.

### 3. Separación de Responsabilidades en Convex y Next.js
- **En Convex:**
  1. La llamada a la API de IA se ejecuta en una **`action`** de Convex (ej. `convex/ai/actions.ts`).
  2. La respuesta del LLM se intercepta y valida con el esquema Zod correspondiente dentro de la acción.
  3. **Solo si la validación es exitosa**, la acción invoca una `internalMutation` para persistir los datos limpios en la base de datos.
  4. Si la validación falla, se puede activar un ciclo de autocorrección (enviando los `ZodIssue` formateados al LLM) o retornar un error controlado.
- **En Next.js / Frontend:**
  - Si la UI recibe streams o sugerencias en tiempo real, las respuestas se validan antes de mutar el estado local de React o disparar re-renders.

### 4. Estrategia de Resiliencia y Degradación Elegante
- Implementar `parseAIWithFallback` en funcionalidades no críticas de la UI para garantizar que el usuario nunca perciba una pantalla rota.
- Proporcionar retroalimentación descriptiva (`formatZodIssuesForPrompt`) cuando se requiera reintento o autocorrección por parte del agente de IA.

---

## Patrón de Referencia

La utilidad estándar del proyecto reside en [`frontend/shared/lib/ai/safe-ai-parser.ts`](../../frontend/shared/lib/ai/safe-ai-parser.ts):

```typescript
import { z } from "zod";
import { safeParseAIResponse } from "@/shared/lib/ai/safe-ai-parser";

// 1. Definir contrato estricto
export const TaskSuggestionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimatedHours: z.coerce.number().min(0).default(1),
  tags: z.array(z.string()).default([]),
});

// 2. Interceptar y validar de forma segura
const aiResult = safeParseAIResponse(TaskSuggestionSchema, rawLLMOutput);

if (!aiResult.success) {
  // Manejar error de forma segura (reintentar con formattedError o fallback)
  console.warn("Respuesta de IA rechazada por validación:", aiResult.formattedError);
  return;
}

// 3. Persistir SOLO datos válidos y tipados
await ctx.runMutation(internal.tasks.mutations.createFromAI, aiResult.data);
```

---

## Consecuencias

- **Positivas:**
  - Garantía absoluta de integridad en la base de datos de Convex.
  - Eliminación de errores de renderizado en React 19 por respuestas inesperadas de LLMs.
  - Tipado estático de TypeScript inferido directamente del esquema (`z.infer<typeof Schema>`).
  - Base sólida, modular y lista para conectar proveedores de IA (Gemini, OpenAI, Anthropic).
- **Compromisos:**
  - Requiere definir un esquema Zod para cada payload esperado de IA.
  - Ligero overhead computacional de parseo/validación (insignificante frente a la latencia del LLM).
