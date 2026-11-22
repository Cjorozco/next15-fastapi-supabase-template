# Encargo: herramienta MCP `editar_tarea`

> **Documento histórico:** encargo original (22 nov 2026), pegado en la sesión de Claude Code y guardado como referencia. Implementado en la rama `feat/mcp-editar-tarea` (ver [ADR 006, enmiendas](../adr/006-servidor-mcp-oauth-supabase.md#enmiendas)). Precisión: la app no tiene "fecha de fin de repetición" (solo el botón "Finalizar repetición", que la termina en el momento), así que ese campo quedó fuera por decisión de José; el punto 3 de la verificación se redujo a cambiar la repetición.

Agrega una herramienta nueva `editar_tarea` al servidor MCP Project_Manager_SaaS.

**Problema:** hoy solo podemos crear tareas, leerlas, cambiar su estado con `mover_tarea` y mover proyectos. No hay forma de editar una tarea existente. La app sí permite editar todos sus campos desde el formulario de edición, así que el servidor debe poder hacer lo mismo. Caso real: la tarea recurrente "Aprendizaje: avanzar el flujo de WhatsApp con n8n" (id `j977bxnsa0gzj1b3n7b9c49r418hkfhw`) tiene fecha 23 nov y repetición "Lun a vie", y hay que poder cambiarle la fecha límite a 30 nov.

**Qué debe hacer `editar_tarea`:**

- Recibe `tarea_id` obligatorio y, opcionales, los campos que se quieran cambiar: título (máximo 200 caracteres), estado (pendiente, en_progreso o completada), prioridad (baja, media o alta), fecha límite (YYYY-MM-DD, hora de Bogotá), un indicador para quitar la fecha límite, repetición (los valores que ya usa la app, por ejemplo diaria, laboral o semanal, y una forma de quitarla), fecha de fin de repetición, duración estimada, notas (un valor vacío las borra) y proyecto (para moverla a otro proyecto).
- Solo cambia los campos que recibe; los demás quedan igual.
- Devuelve un resumen de cada cambio con formato "campo: antes → después", igual que `editar_proyecto` y `cambiar_estado_proyecto`, para que el usuario lo confirme.
- No borra la tarea.
- Si el id no existe, devuelve un error claro y no cambia nada.

**Fuera de alcance por ahora:** editar subtareas y borrar tareas o proyectos. Si se quieren después, van en tareas aparte.

**Cómo verificar:**

1. Cambiar la fecha de la tarea de n8n a 2026-11-30 y comprobar con la consulta de detalle que la fecha quedó bien y el resto de campos no cambió.
2. Comprobar que el resumen devuelto muestra "fecha: 2026-11-23 → 2026-11-30".
3. Cambiar repetición y fecha de fin de repetición en la misma llamada.
4. Mover una tarea de prueba a otro proyecto y comprobar que aparece en el nuevo.
5. Probar con un id inexistente y confirmar que devuelve error sin cambiar nada.

Prueba todo primero en un proyecto de prueba, no en tareas reales. Usa el mismo estilo de nombres y respuestas que las herramientas que ya existen.
