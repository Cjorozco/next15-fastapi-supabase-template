import type { TaskPriority, TaskRecurrence } from '@/convex/lib/taskFields';
import { fromDateInputValue } from '@/domains/tasks/lib/dates';
import { formatDurationInput, parseDuration } from '@/domains/tasks/lib/duration';
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
  /** What the user sees and types: "10 min", "1.5 h" (a bare number is hours). */
  estimatedHours: string;
  /** `YYYY-MM-DD` as used by `<input type="date">`, or empty. */
  dueDate: string;
  /** No deadline by nature (habit, open task). Mutually exclusive with a date. */
  noDeadline: boolean;
  recurrence: TaskRecurrence | '';
  notes: string;
  /** One subtask title per line. */
  subtasks: string;
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
    noDeadline?: boolean;
    recurrence?: TaskRecurrence;
    notes?: string;
    subtasks?: string[];
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
    noDeadline: false,
    recurrence: '',
    notes: '',
    subtasks: '',
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
        estimatedHours: task.estimatedHours === undefined ? '' : formatDurationInput(task.estimatedHours),
        dueDate: task.dueDate ?? '',
        noDeadline: task.noDeadline === true,
        recurrence: task.recurrence ?? '',
        notes: task.notes ?? '',
        subtasks: (task.subtasks ?? []).join('\n'),
      })
    ),
  };
}

/** Converts the (possibly edited) draft into `projects.createWithTasks` arguments. */
export function draftToCreateArgs(draft: ProjectDraft): CreateProjectArgs {
  const tasks = draft.tasks
    .filter((task) => task.title.trim())
    .map((task, position) => {
      const hours = parseDuration(task.estimatedHours);
      const subtasks = task.subtasks
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const notes = task.notes.trim();
      const dueDate = fromDateInputValue(task.dueDate);
      return {
        title: task.title.trim(),
        position,
        ...(task.priority ? { priority: task.priority } : {}),
        ...(hours !== null && hours > 0 ? { estimatedHours: hours } : {}),
        ...(dueDate !== null ? { dueDate } : task.noDeadline ? { noDeadline: true } : {}),
        ...(task.recurrence ? { recurrence: task.recurrence } : {}),
        ...(subtasks.length > 0 ? { subtasks } : {}),
        ...(notes ? { notes } : {}),
      };
    });

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    tasks,
  };
}

const draftSnapshot = (draft: ProjectDraft) =>
  JSON.stringify({
    name: draft.name,
    description: draft.description,
    // `key` is only an identity for React lists, not content the user can change.
    tasks: draft.tasks.map((task) => ({ ...task, key: undefined })),
  });

/** True when the draft differs from `initial` in anything the user can edit. */
export function isDraftDirty(initial: ProjectDraft, current: ProjectDraft): boolean {
  return draftSnapshot(initial) !== draftSnapshot(current);
}
