# Principios Universales de UX y Diseño Frontend

> **Ámbito:** Frontend (`app/**/*.{tsx,jsx,ts}`, `shared/**/*.{tsx,jsx,ts}`, `domains/**/*.{tsx,jsx,ts}`).
> **Descripción:** Heurísticas de usabilidad, diseño móvil en campo y reglas de implementación para React, Next.js y TypeScript.

---

## 1. Gestión de Complejidad y Claridad (Ley de Tesler & Ley de Hick)

- **Abstracción Técnica:** Asume la complejidad (estado, transformaciones de datos) en el código para que la interfaz se mantenga limpia.
- **Límites de Decisión:** Limita las opciones presentadas al usuario simultáneamente (máximo 3 a 5).
- **Flujos Progresivos:** Prefiere flujos paso a paso (`multi-step`) usando estado local sobre formularios excesivamente largos.
- **Lenguaje UI:** Copys (labels, tooltips, mensajes de ayuda) directos, claros y accionables. Cero jerga técnica en la UI.

---

## 2. Consistencia y Patrones (Ley de Jakob)

- **Reutilización Estricta:** Construye ensamblando componentes base, *design tokens* y patrones ya existentes en el repositorio. No inventes elementos de UI si ya existe un equivalente.
- **Familiaridad:** Utiliza patrones de navegación e interacción estándar. Evita animaciones que sacrifiquen usabilidad.
- **Separación de Dominios:** Respeta la convención del proyecto:
  - Componentes agnósticos y reutilizables van en `shared/` (sin términos de negocio).
  - Componentes específicos de una entidad van en `domains/{dominio}/components/`.

---

## 3. Flexibilidad de Entradas y Prevención de Errores (Ley de Postel)

- **Inputs Resilientes:** Sé estricto en lo que envías al backend, pero flexible en lo que recibes del usuario. Sanitiza en el cliente (trim de texto, normalizar comas `,` a puntos `.` en números).
- **Normalización de Texto y Casing:** Los datos ingresados libremente por usuarios en terreno o administradores (nombres de personas, destinatarios, motivos o notas) pueden venir en mayúsculas sostenidas, todo en minúsculas o con espaciado irregular. La UI y formularios deben normalizarlos de forma consistente usando `@/shared/lib/formatText`:
  - **Nombres y Entidades (Title Case — `formatTitleCase`):** Destinatarios, procedencias, clientes y comercios llevan mayúscula inicial por palabra, manteniendo preposiciones y artículos intermedios en minúsculas (*"Pago Darwin Factura Vieja"*, *"Taller de Frenos"*).
  - **Motivos, Conceptos y Descripciones (Sentence case — `formatSentenceCase`):** Conceptos de pago, motivos, notas u observaciones llevan mayúscula inicial únicamente al comenzar la oración (*"Venta vieja"*, *"Reparación de frenos"*).
  - **Doble capa de consistencia:** Aplicar tanto en presentación (tablas/listas para normalizar datos ya existentes en base de datos) como en el submit de formularios (`handleSubmit`) para persistir registros limpios.
- **Frontera Frontend vs. Backend (Convex):** La resiliencia del cliente es puramente sintáctica. **Nunca hagas cálculos de negocio derivados en la UI** (precios aplicados, totales, pesos netos): el frontend envía datos crudos y Convex calcula y sella en la mutation.
- **Tolerancia a Fallos:** Usa `ErrorBoundaries` y maneja estados `null` o `undefined` sin romper la aplicación.
- **Acciones Destructivas:** Exige siempre confirmación explícita con semántica de advertencia antes de desactivar o alterar datos sensibles (ej. desactivación de clientes o usuarios).

---

## 4. Sistemas de Feedback (Peak-End Rule)

- **Visibilidad del Estado:** Provee feedback visual inmediato (ej. estado `disabled` al hacer submit, spinners, *skeletons* durante carga).
- **Notificaciones Claras:** Usa toasts informativos y no invasivos para confirmar el éxito o fracaso de acciones importantes.

---

## 5. Arquitectura de UI y Jerarquía (Ley de Miller & Efecto von Restorff)

- **Agrupación Visual (Chunking):** Agrupa la información en bloques lógicos cortos (máximo 7 ± 2 elementos).
- **Jerarquía de Acción:** Destaca visualmente el *Call to Action* (CTA) principal de la vista.

---

## 6. Accesibilidad y Contexto Operativo (Ley de Fitts & Estándares Web)

- **Mobile-First para Operadores en Terreno:** La aplicación es utilizada en campo (recolecciones de aceite en restaurantes). El diseño móvil debe ser óptimo para uso con una sola mano.
- **Áreas de Interacción Táctil:** Botones, selects y enlaces interactivos deben cumplir un target táctil mínimo de 44 × 44 px con espaciado adecuado.
- **Teclados Móviles Adecuados:** Usa siempre `inputMode="decimal"` o `inputMode="numeric"` en campos de recolección (litros, pesos, pimpinas).
- **Semántica y Accesibilidad (A11y):** HTML semántico, etiquetas `aria-label` donde no haya texto visible, y contraste de color accesible.

---

## 7. Alineación con Reglas de Arquitectura

1. **UI Tonta, Backend Fuerte:** La UI captura datos del usuario y refleja el estado devuelto por queries de Convex. No toma decisiones de autorización (las valida el servidor vía `requireAdmin` o `requireAuthenticatedUser`).
2. **Prioridad de Librerías:** Las sugerencias de librerías en `AGENTS.md` aplican solo si el proyecto aún no resuelve el problema. En UI se priorizan la simplicidad del MVP y los componentes existentes en `shared/`.
