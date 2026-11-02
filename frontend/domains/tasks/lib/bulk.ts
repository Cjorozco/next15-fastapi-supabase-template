export const MAX_BULK_TASKS = 50;

const LIST_MARKER = /^(?:[-*•–]\s+|\d+[.)]\s+|\[[ xX]?\]\s*)/;

/**
 * Splits pasted text into task titles, one per non-empty line. Leading list markers
 * ("- ", "* ", "1. ", "[ ] ") are dropped so a pasted checklist becomes clean titles.
 */
export function parsePastedTasks(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(LIST_MARKER, '').trim())
    .filter(Boolean);
}
