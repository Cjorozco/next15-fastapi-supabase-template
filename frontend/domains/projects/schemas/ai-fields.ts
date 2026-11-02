import { z } from "zod";
import { fromDateInputValue } from "@/domains/tasks/lib/dates";
import type { TaskPriority, TaskRecurrence } from "@/convex/lib/taskFields";
import { minutesToHours } from "@/domains/tasks/lib/duration";

export const AI_MAX_TASK_HOURS = 40;

const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  alta: "alta",
  alto: "alta",
  high: "alta",
  urgente: "alta",
  media: "media",
  medio: "media",
  medium: "media",
  baja: "baja",
  bajo: "baja",
  low: "baja",
};

/** Maps whatever the model wrote to a task priority; anything unknown becomes undefined. */
export function normalizeAiPriority(value: unknown): TaskPriority | undefined {
  if (typeof value !== "string") return undefined;
  return PRIORITY_ALIASES[value.trim().toLowerCase()];
}

/**
 * Positive hours rounded to the minute (10 min = 0.1667 h, as the duration inputs
 * store it), capped; anything else becomes undefined. Short durations must survive:
 * rounding to half hours would drop them.
 */
export function normalizeAiHours(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  const minutes = Math.max(1, Math.round(hours * 60));
  return Math.min(AI_MAX_TASK_HOURS, minutesToHours(minutes));
}

export const AI_MAX_SUBTASKS = 8;
export const AI_MAX_NOTES_LENGTH = 500;

/** Up to 8 non-empty subtask titles; anything else is dropped. */
export function normalizeAiSubtasks(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const titles = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, AI_MAX_SUBTASKS);
  return titles.length > 0 ? titles : undefined;
}
export const aiSubtasksField = z.unknown().transform(normalizeAiSubtasks).optional();

/** A short note (trimmed, capped); anything else is dropped. */
export function normalizeAiNotes(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const notes = value.trim().slice(0, AI_MAX_NOTES_LENGTH);
  return notes || undefined;
}
export const aiNotesField = z.unknown().transform(normalizeAiNotes).optional();

const RECURRENCE_ALIASES: Record<string, TaskRecurrence> = {
  diaria: "diaria",
  diario: "diaria",
  daily: "diaria",
  semanal: "semanal",
  weekly: "semanal",
};

/** Maps whatever the model wrote to a recurrence; anything unknown becomes undefined. */
export function normalizeAiRecurrence(value: unknown): TaskRecurrence | undefined {
  if (typeof value !== "string") return undefined;
  return RECURRENCE_ALIASES[value.trim().toLowerCase()];
}
export const aiRecurrenceField = z.unknown().transform(normalizeAiRecurrence).optional();

/** Keeps only real `YYYY-MM-DD` calendar days; anything else becomes undefined. */
export function normalizeAiDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return fromDateInputValue(trimmed) === null ? undefined : trimmed;
}

/**
 * The optional task fields are lenient on purpose: a bad priority, hours or date is
 * dropped instead of failing the whole response, because the user reviews the draft.
 */
export const aiPriorityField = z.unknown().transform(normalizeAiPriority).optional();
export const aiHoursField = z.unknown().transform(normalizeAiHours).optional();
export const aiDateField = z.unknown().transform(normalizeAiDate).optional();

/** Only a real `true` counts; anything else is "not flagged". */
export function normalizeAiNoDeadline(value: unknown): true | undefined {
  return value === true || value === 'true' ? true : undefined;
}
export const aiNoDeadlineField = z.unknown().transform(normalizeAiNoDeadline).optional();

export const DATE_OR_NO_DEADLINE_MESSAGE =
  'Cada tarea necesita "dueDate" (YYYY-MM-DD) o "noDeadline": true; no puede quedar sin ninguno';

/** A task either has a date or is explicitly marked as having no deadline, never neither. */
export function hasDateOrNoDeadline(task: { dueDate?: string; noDeadline?: true }): boolean {
  return task.dueDate !== undefined || task.noDeadline === true;
}

/** When the model sends both, the date wins. */
export function dropFlagWhenDated<T extends { dueDate?: string; noDeadline?: true }>(task: T): T {
  return task.dueDate !== undefined && task.noDeadline ? { ...task, noDeadline: undefined } : task;
}

const MAX_DESCRIPTION_SENTENCES = 2;
const MAX_DESCRIPTION_CHARS = 400;

/** Keeps at most two sentences so a long description never repeats the prompt. */
export function limitSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [];
  const limited = sentences
    .slice(0, MAX_DESCRIPTION_SENTENCES)
    .join("")
    .trim();
  return limited.length > MAX_DESCRIPTION_CHARS
    ? `${limited.slice(0, MAX_DESCRIPTION_CHARS - 1).trimEnd()}…`
    : limited;
}
