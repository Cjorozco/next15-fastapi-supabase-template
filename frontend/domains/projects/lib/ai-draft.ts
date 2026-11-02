import type { TaskPriority } from '@/convex/lib/taskFields';
import { fromDateInputValue } from '@/domains/tasks/lib/dates';
import type { AiProject } from '@/domains/projects/schemas/ai-project.schema';

const MAX_EXPLICIT_TITLE_LENGTH = 80;
const MIN_EXPLICIT_TITLE_LENGTH = 3;

/**
 * A prompt that starts with a short title ended by "." or ":" (followed by a space or
 * line break) names the project: that text is used verbatim as the project name and the
 * rest is what the model gets to work with. Returns null when there is no such title.
 */
export function extractExplicitTitle(prompt: string): { title: string; rest: string } | null {
  const trimmed = prompt.trim();
  const separator = /[:.](?=\s)/.exec(trimmed);
  if (!separator) return null;

  const title = trimmed.slice(0, separator.index).trim();
  const rest = trimmed.slice(separator.index + 1).trim();
  if (!rest) return null;
  if (title.length < MIN_EXPLICIT_TITLE_LENGTH || title.length > MAX_EXPLICIT_TITLE_LENGTH) {
    return null;
  }
  return { title, rest };
}

/** Editable copy of a task: inputs stay strings so the form can hold partial values. */
export interface DraftTask {
  key: string;
  title: string;
  priority: TaskPriority | '';
  estimatedHours: string;
  /** `YYYY-MM-DD` as used by `<input type="date">`, or empty. */
  dueDate: string;
}

export interface ProjectDraft {
  name: string;
  description: string;
  tasks: DraftTask[];
}

export interface CreateProjectArgs {
  name: string;
  description?: string;
  tasks: Array<{
    title: string;
    position: number;
    priority?: TaskPriority;
    estimatedHours?: number;
    dueDate?: number;
  }>;
}

let draftKeyCounter = 0;

export function newDraftTask(partial: Partial<Omit<DraftTask, 'key'>> = {}): DraftTask {
  draftKeyCounter += 1;
  return {
    key: `draft-${draftKeyCounter}`,
    title: '',
    priority: '',
    estimatedHours: '',
    dueDate: '',
    ...partial,
  };
}

/** Builds the editable draft; a name written by the user always wins over the AI's. */
export function projectToDraft(project: AiProject, fixedName?: string): ProjectDraft {
  return {
    name: fixedName?.trim() || project.projectName,
    description: project.description,
    tasks: project.tasks.map((task) =>
      newDraftTask({
        title: task.title,
        priority: task.priority ?? '',
        estimatedHours: task.estimatedHours === undefined ? '' : String(task.estimatedHours),
        dueDate: task.dueDate ?? '',
      })
    ),
  };
}

/** Converts the (possibly edited) draft into `projects.createWithTasks` arguments. */
export function draftToCreateArgs(draft: ProjectDraft): CreateProjectArgs {
  const tasks = draft.tasks
    .filter((task) => task.title.trim())
    .map((task, position) => {
      const hours = Number(task.estimatedHours.replace(',', '.'));
      const dueDate = fromDateInputValue(task.dueDate);
      return {
        title: task.title.trim(),
        position,
        ...(task.priority ? { priority: task.priority } : {}),
        ...(task.estimatedHours.trim() && Number.isFinite(hours) && hours > 0
          ? { estimatedHours: hours }
          : {}),
        ...(dueDate !== null ? { dueDate } : {}),
      };
    });

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    tasks,
  };
}
