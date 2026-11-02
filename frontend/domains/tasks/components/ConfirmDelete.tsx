'use client';

interface ConfirmDeleteProps {
  /** What is being deleted, for screen readers ("tarea Diseñar API"). */
  subject: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Inline "¿Borrar? Sí / No" confirmation, same pattern as deleting a project. */
export function ConfirmDelete({ subject, onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div
      role="group"
      aria-label={`Confirmar borrado de ${subject}`}
      className="flex items-center gap-1 shrink-0"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <span className="text-xs text-destructive px-1">¿Borrar?</span>
      <button
        type="button"
        onClick={onConfirm}
        className="text-xs bg-destructive text-white px-2.5 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Sí<span className="sr-only">, borrar {subject}</span>
      </button>
      <button
        type="button"
        autoFocus
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        No<span className="sr-only">, conservar {subject}</span>
      </button>
    </div>
  );
}
