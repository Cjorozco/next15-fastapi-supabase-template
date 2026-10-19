/**
 * Datos del usuario demo. Las fechas son offsets en días respecto al momento
 * del reinicio, para que la demo nunca parezca vencida.
 */

import type { TaskPriority, TaskStatus } from "./taskFields";

export type DemoStatus = TaskStatus;
export type DemoPriority = TaskPriority;

export interface DemoTask {
  title: string;
  status: DemoStatus;
  priority: DemoPriority;
  dueInDays: number;
  assignee: string;
  subtasks?: { title: string; isCompleted: boolean }[];
}

export interface DemoProject {
  name: string;
  description: string;
  tasks: DemoTask[];
}

export const DEMO_MEMBERS = ["Lucía Ramos", "Mateo Vidal", "Sofía Herrera"] as const;
const [LUCIA, MATEO, SOFIA] = DEMO_MEMBERS;

export const DEMO_PROJECTS: DemoProject[] = [
  {
    name: "Lanzamiento de app móvil",
    description:
      "Salida a producción de la app móvil v1.0 en iOS y Android: build, QA, ficha de tienda y plan de comunicación.",
    tasks: [
      { title: "Definir alcance del MVP", status: "completada", priority: "alta", dueInDays: -20, assignee: LUCIA },
      { title: "Diseñar flujo de onboarding", status: "completada", priority: "media", dueInDays: -14, assignee: SOFIA },
      { title: "Integrar notificaciones push", status: "completada", priority: "media", dueInDays: -7, assignee: MATEO },
      {
        title: "Pruebas de regresión en iOS y Android",
        status: "en_progreso",
        priority: "alta",
        dueInDays: 3,
        assignee: MATEO,
        subtasks: [
          { title: "Dispositivos iOS", isCompleted: true },
          { title: "Dispositivos Android", isCompleted: false },
        ],
      },
      { title: "Optimizar tiempo de arranque", status: "en_progreso", priority: "media", dueInDays: 5, assignee: MATEO },
      { title: "Preparar capturas y ficha de la tienda", status: "en_progreso", priority: "baja", dueInDays: 6, assignee: SOFIA },
      { title: "Redactar política de privacidad", status: "pendiente", priority: "alta", dueInDays: 8, assignee: LUCIA },
      { title: "Configurar monitoreo de errores", status: "pendiente", priority: "media", dueInDays: 10, assignee: MATEO },
      { title: "Plan de comunicación del lanzamiento", status: "pendiente", priority: "baja", dueInDays: 12, assignee: SOFIA },
      { title: "Enviar build a revisión de las tiendas", status: "pendiente", priority: "alta", dueInDays: 14, assignee: LUCIA },
    ],
  },
  {
    name: "Rediseño del sitio web",
    description:
      "Renovación del sitio corporativo: nueva identidad visual, arquitectura de contenidos y mejora de rendimiento.",
    tasks: [
      { title: "Auditoría de contenido actual", status: "completada", priority: "media", dueInDays: -25, assignee: SOFIA },
      { title: "Benchmark de la competencia", status: "completada", priority: "baja", dueInDays: -21, assignee: LUCIA },
      { title: "Nueva arquitectura de información", status: "completada", priority: "alta", dueInDays: -12, assignee: SOFIA },
      {
        title: "Diseño de la página de inicio",
        status: "en_progreso",
        priority: "alta",
        dueInDays: 2,
        assignee: SOFIA,
        subtasks: [
          { title: "Versión escritorio", isCompleted: true },
          { title: "Versión móvil", isCompleted: false },
        ],
      },
      { title: "Sistema de componentes y guía de estilo", status: "en_progreso", priority: "media", dueInDays: 6, assignee: SOFIA },
      { title: "Maquetar páginas de servicios", status: "pendiente", priority: "media", dueInDays: 9, assignee: MATEO },
      { title: "Migrar el blog al nuevo CMS", status: "pendiente", priority: "baja", dueInDays: 15, assignee: MATEO },
      { title: "Optimizar imágenes y Core Web Vitals", status: "pendiente", priority: "alta", dueInDays: 18, assignee: MATEO },
      { title: "Revisión de accesibilidad (WCAG AA)", status: "pendiente", priority: "media", dueInDays: 20, assignee: LUCIA },
    ],
  },
  {
    name: "Migración de sistemas internos",
    description:
      "Traslado del ERP y las herramientas internas a la nueva infraestructura en la nube, sin interrumpir la operación.",
    tasks: [
      { title: "Inventario de aplicaciones y dependencias", status: "completada", priority: "alta", dueInDays: -30, assignee: LUCIA },
      { title: "Elegir estrategia de migración por sistema", status: "completada", priority: "alta", dueInDays: -22, assignee: LUCIA },
      { title: "Provisionar entorno de staging", status: "completada", priority: "media", dueInDays: -10, assignee: MATEO },
      {
        title: "Migrar base de datos del ERP",
        status: "en_progreso",
        priority: "alta",
        dueInDays: 4,
        assignee: MATEO,
        subtasks: [
          { title: "Ensayo de migración en staging", isCompleted: true },
          { title: "Validar integridad de datos", isCompleted: false },
          { title: "Definir ventana de corte", isCompleted: false },
        ],
      },
      { title: "Configurar accesos y roles (SSO)", status: "en_progreso", priority: "media", dueInDays: 7, assignee: SOFIA },
      { title: "Capacitar a los equipos usuarios", status: "pendiente", priority: "media", dueInDays: 11, assignee: SOFIA },
      { title: "Plan de rollback documentado", status: "pendiente", priority: "alta", dueInDays: 13, assignee: LUCIA },
      { title: "Corte a producción", status: "pendiente", priority: "alta", dueInDays: 21, assignee: MATEO },
      { title: "Apagar la infraestructura antigua", status: "pendiente", priority: "baja", dueInDays: 35, assignee: LUCIA },
    ],
  },
];
