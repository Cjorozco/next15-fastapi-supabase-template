import { z } from "zod";
import { fromDateInputValue } from "@/domains/tasks/lib/dates";
import type { TaskPriority } from "@/convex/lib/taskFields";

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

/** Positive hours rounded to half hours and capped; anything else becomes undefined. */
export function normalizeAiHours(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  return Math.min(AI_MAX_TASK_HOURS, Math.round(hours * 2) / 2) || undefined;
}

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
