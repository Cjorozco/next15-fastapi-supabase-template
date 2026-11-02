'use client';

import { Label } from '@/shared/components/ui/label';
import { NativeSelect } from '@/shared/components/ui/native-select';
import {
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type ProjectFilters,
} from '@/convex/lib/projectFields';

interface ProjectFilterBarProps {
  filters: ProjectFilters;
  onChange: (filters: ProjectFilters) => void;
}

/** Status and priority filters for the projects list. */
export function ProjectFilterBar({ filters, onChange }: ProjectFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-6" role="group" aria-label="Filtros de proyectos">
      <div className="space-y-1">
        <Label htmlFor="filter-project-status" className="text-xs text-muted-foreground">
          Estado
        </Label>
        <NativeSelect
          id="filter-project-status"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as ProjectFilters['status'] })}
          className="text-xs rounded-xl w-40"
        >
          <option value="todos">Todos</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PROJECT_STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-project-priority" className="text-xs text-muted-foreground">
          Prioridad
        </Label>
        <NativeSelect
          id="filter-project-priority"
          value={filters.priority}
          onChange={(e) =>
            onChange({ ...filters, priority: e.target.value as ProjectFilters['priority'] })
          }
          className="text-xs rounded-xl w-40"
        >
          <option value="todas">Todas</option>
          {PROJECT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PROJECT_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
