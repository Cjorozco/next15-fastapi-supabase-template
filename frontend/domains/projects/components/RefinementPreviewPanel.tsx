import { CheckCircle2, Loader2, Plus, ArrowLeft, AlertCircle, CornerDownRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { RefinementPreview } from '@/domains/projects/lib/refinement-preview';

interface RefinementPreviewPanelProps {
  preview: RefinementPreview;
  isApplying: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

/** Read-only review of what "Refinar con IA" would change. Nothing is saved until confirmed. */
export function RefinementPreviewPanel({
  preview,
  isApplying,
  onConfirm,
  onBack,
}: RefinementPreviewPanelProps) {
  return (
    <div className="space-y-4 pt-2" data-testid="refinement-preview">
      {preview.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{preview.summary}</p>
      )}

      {!preview.hasChanges && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>La IA no propuso cambios para este proyecto. Prueba con otra instrucción.</span>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
        {preview.description && (
          <section className="space-y-1.5" aria-label="Cambio en la descripción">
            <h4 className="text-xs font-semibold text-foreground">Descripción</h4>
            <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Antes</p>
              <p className="text-muted-foreground line-through decoration-destructive/50">
                {preview.description.before || 'Sin descripción'}
              </p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-2.5 text-xs">
              <p className="text-xs uppercase tracking-wide text-success mb-1">
                Después
              </p>
              <p className="text-foreground">{preview.description.after}</p>
            </div>
          </section>
        )}

        {preview.newTasks.length > 0 && (
          <section className="space-y-1.5" aria-label="Tareas nuevas">
            <h4 className="text-xs font-semibold text-foreground">
              Tareas nuevas ({preview.newTasks.length})
            </h4>
            <ul className="space-y-1.5">
              {preview.newTasks.map((task, index) => (
                <li key={`${task.title}-${index}`} className="text-xs">
                  <div className="flex items-start gap-1.5 text-foreground">
                    <Plus className="w-3 h-3 mt-0.5 text-success shrink-0" />
                    <span>{task.title}</span>
                  </div>
                  {task.subtasks.length > 0 && (
                    <ul className="pl-5 mt-1 space-y-0.5">
                      {task.subtasks.map((subtask, i) => (
                        <li key={`${subtask}-${i}`} className="flex items-start gap-1.5 text-muted-foreground">
                          <CornerDownRight className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{subtask}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {preview.existingTaskSubtasks.length > 0 && (
          <section className="space-y-1.5" aria-label="Subtareas para tareas existentes">
            <h4 className="text-xs font-semibold text-foreground">Subtareas en tareas existentes</h4>
            <ul className="space-y-2">
              {preview.existingTaskSubtasks.map((item) => (
                <li key={item.taskId} className="text-xs">
                  <p className="text-foreground font-medium">{item.taskTitle}</p>
                  <ul className="pl-3 mt-1 space-y-0.5">
                    {item.subtaskTitles.map((subtask, i) => (
                      <li key={`${subtask}-${i}`} className="flex items-start gap-1.5 text-muted-foreground">
                        <Plus className="w-3 h-3 mt-0.5 text-success shrink-0" />
                        <span>{subtask}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}

        {preview.skippedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {preview.skippedCount} propuesta(s) apuntaban a tareas que no existen y se omitieron.
          </p>
        )}
      </div>

      {preview.hasChanges && (
        <p className="text-xs text-muted-foreground">
          No se borra ninguna tarea. Revisa los cambios y confirma para aplicarlos.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          disabled={isApplying}
          onClick={onBack}
          className="flex-1 border-border text-foreground/80 hover:bg-muted text-xs rounded-xl h-9"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {preview.hasChanges ? 'Descartar' : 'Volver'}
        </Button>
        {preview.hasChanges && (
          <Button
            type="button"
            disabled={isApplying}
            onClick={onConfirm}
            className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl h-9 shadow-md shadow-primary/20"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                <span>Aplicar cambios</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
