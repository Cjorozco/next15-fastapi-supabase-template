import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

const listeners = new Set<() => void>();
// Fallback for browsers where localStorage throws (private mode, blocked site data).
let memoryValue = false;

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return memoryValue;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the preference.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setSidebarCollapsed(collapsed: boolean): void {
  memoryValue = collapsed;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // Keep the in-memory value; the choice just will not survive a reload.
  }
  notify();
}

/**
 * Whether the desktop sidebar is collapsed. Every page mounts its own Sidebar, so the
 * choice lives in localStorage (shared by all instances and tabs). The server render and
 * the first client render are always "expanded", which avoids a hydration mismatch.
 */
export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  return [collapsed, setSidebarCollapsed];
}
