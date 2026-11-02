/**
 * Project status / priority helpers shared by Convex functions and the UI.
 *
 * Pure TypeScript (no Convex runtime imports) so the frontend can import it too.
 * Both fields are optional in the database: a project without them is "activo" with
 * priority "ninguna", so documents created before these fields existed need no migration.
 */

export const PROJECT_STATUSES = ["activo", "en_pausa", "completado"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ["alta", "media", "baja", "ninguna"] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  activo: "Activo",
  en_pausa: "En pausa",
  completado: "Completado",
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  ninguna: "Sin prioridad",
};

export function resolveProjectStatus(project: { status?: ProjectStatus }): ProjectStatus {
  return project.status ?? "activo";
}

export function resolveProjectPriority(project: { priority?: ProjectPriority }): ProjectPriority {
  return project.priority ?? "ninguna";
}

interface SortableProject {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  dueDate?: number;
}

const STATUS_RANK: Record<ProjectStatus, number> = { activo: 0, en_pausa: 1, completado: 2 };
const PRIORITY_RANK: Record<ProjectPriority, number> = { alta: 0, media: 1, baja: 2, ninguna: 3 };

/**
 * Listing order: status (active, paused, completed), then priority (high first, none
 * last), then due date (soonest first, no date last). Ties keep their original order
 * because `Array.prototype.sort` is stable.
 */
export function compareProjects(a: SortableProject, b: SortableProject): number {
  const byStatus = STATUS_RANK[resolveProjectStatus(a)] - STATUS_RANK[resolveProjectStatus(b)];
  if (byStatus !== 0) return byStatus;

  const byPriority =
    PRIORITY_RANK[resolveProjectPriority(a)] - PRIORITY_RANK[resolveProjectPriority(b)];
  if (byPriority !== 0) return byPriority;

  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === undefined) return 1;
  if (b.dueDate === undefined) return -1;
  return a.dueDate - b.dueDate;
}

export interface ProjectFilters {
  status: ProjectStatus | "todos";
  priority: ProjectPriority | "todas";
}

export const NO_PROJECT_FILTERS: ProjectFilters = { status: "todos", priority: "todas" };

export function sortAndFilterProjects<T extends SortableProject>(
  projects: readonly T[],
  filters: ProjectFilters = NO_PROJECT_FILTERS
): T[] {
  return projects
    .filter(
      (project) =>
        (filters.status === "todos" || resolveProjectStatus(project) === filters.status) &&
        (filters.priority === "todas" || resolveProjectPriority(project) === filters.priority)
    )
    .sort(compareProjects);
}
