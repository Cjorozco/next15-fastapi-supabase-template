/**
 * Datos del usuario demo. Las fechas son offsets en días respecto al momento
 * del reinicio, para que la demo nunca parezca vencida.
 */

export type DemoStatus = "todo" | "in_progress" | "done";
export type DemoPriority = "low" | "medium" | "high";

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
      { title: "Definir alcance del MVP", status: "done", priority: "high", dueInDays: -20, assignee: LUCIA },
      { title: "Diseñar flujo de onboarding", status: "done", priority: "medium", dueInDays: -14, assignee: SOFIA },
      { title: "Integrar notificaciones push", status: "done", priority: "medium", dueInDays: -7, assignee: MATEO },
      {
        title: "Pruebas de regresión en iOS y Android",
        status: "in_progress",
        priority: "high",
        dueInDays: 3,
        assignee: MATEO,
        subtasks: [
          { title: "Dispositivos iOS", isCompleted: true },
          { title: "Dispositivos Android", isCompleted: false },
        ],
      },
      { title: "Optimizar tiempo de arranque", status: "in_progress", priority: "medium", dueInDays: 5, assignee: MATEO },
      { title: "Preparar capturas y ficha de la tienda", status: "in_progress", priority: "low", dueInDays: 6, assignee: SOFIA },
      { title: "Redactar política de privacidad", status: "todo", priority: "high", dueInDays: 8, assignee: LUCIA },
      { title: "Configurar monitoreo de errores", status: "todo", priority: "medium", dueInDays: 10, assignee: MATEO },
      { title: "Plan de comunicación del lanzamiento", status: "todo", priority: "low", dueInDays: 12, assignee: SOFIA },
      { title: "Enviar build a revisión de las tiendas", status: "todo", priority: "high", dueInDays: 14, assignee: LUCIA },
    ],
  },
  {
    name: "Rediseño del sitio web",
    description:
      "Renovación del sitio corporativo: nueva identidad visual, arquitectura de contenidos y mejora de rendimiento.",
    tasks: [
      { title: "Auditoría de contenido actual", status: "done", priority: "medium", dueInDays: -25, assignee: SOFIA },
      { title: "Benchmark de la competencia", status: "done", priority: "low", dueInDays: -21, assignee: LUCIA },
      { title: "Nueva arquitectura de información", status: "done", priority: "high", dueInDays: -12, assignee: SOFIA },
      {
        title: "Diseño de la página de inicio",
        status: "in_progress",
        priority: "high",
        dueInDays: 2,
        assignee: SOFIA,
        subtasks: [
          { title: "Versión escritorio", isCompleted: true },
          { title: "Versión móvil", isCompleted: false },
        ],
      },
      { title: "Sistema de componentes y guía de estilo", status: "in_progress", priority: "medium", dueInDays: 6, assignee: SOFIA },
      { title: "Maquetar páginas de servicios", status: "todo", priority: "medium", dueInDays: 9, assignee: MATEO },
      { title: "Migrar el blog al nuevo CMS", status: "todo", priority: "low", dueInDays: 15, assignee: MATEO },
      { title: "Optimizar imágenes y Core Web Vitals", status: "todo", priority: "high", dueInDays: 18, assignee: MATEO },
      { title: "Revisión de accesibilidad (WCAG AA)", status: "todo", priority: "medium", dueInDays: 20, assignee: LUCIA },
    ],
  },
  {
    name: "Migración de sistemas internos",
    description:
      "Traslado del ERP y las herramientas internas a la nueva infraestructura en la nube, sin interrumpir la operación.",
    tasks: [
      { title: "Inventario de aplicaciones y dependencias", status: "done", priority: "high", dueInDays: -30, assignee: LUCIA },
      { title: "Elegir estrategia de migración por sistema", status: "done", priority: "high", dueInDays: -22, assignee: LUCIA },
      { title: "Provisionar entorno de staging", status: "done", priority: "medium", dueInDays: -10, assignee: MATEO },
      {
        title: "Migrar base de datos del ERP",
        status: "in_progress",
        priority: "high",
        dueInDays: 4,
        assignee: MATEO,
        subtasks: [
          { title: "Ensayo de migración en staging", isCompleted: true },
          { title: "Validar integridad de datos", isCompleted: false },
          { title: "Definir ventana de corte", isCompleted: false },
        ],
      },
      { title: "Configurar accesos y roles (SSO)", status: "in_progress", priority: "medium", dueInDays: 7, assignee: SOFIA },
      { title: "Capacitar a los equipos usuarios", status: "todo", priority: "medium", dueInDays: 11, assignee: SOFIA },
      { title: "Plan de rollback documentado", status: "todo", priority: "high", dueInDays: 13, assignee: LUCIA },
      { title: "Corte a producción", status: "todo", priority: "high", dueInDays: 21, assignee: MATEO },
      { title: "Apagar la infraestructura antigua", status: "todo", priority: "low", dueInDays: 35, assignee: LUCIA },
    ],
  },
];
