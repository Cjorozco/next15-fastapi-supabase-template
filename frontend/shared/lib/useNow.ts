import { useSyncExternalStore } from 'react';

const TICK_MS = 60_000;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

/** Current time rounded down to the minute, so the snapshot is stable between ticks. */
function getSnapshot(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // One shared timer for every subscriber instead of one interval per task row.
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), TICK_MS);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Current timestamp (minute precision) that keeps components in sync as time passes,
 * e.g. a due date turning overdue at midnight. Keeps render pure: no `Date.now()` calls.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
