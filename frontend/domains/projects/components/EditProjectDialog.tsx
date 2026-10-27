'use client';

import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useUpdateProject } from '@/domains/projects/hooks/useProjects';
import { Id } from '@/convex/_generated/dataModel';

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

interface EditProjectDialogProps {
  projectId: Id<'projects'>;
  name: string;
  description?: string;
  className?: string;
}

interface EditProjectFormProps extends Omit<EditProjectDialogProps, 'className'> {
  onDone: () => void;
}

/** Mounted only while the dialog is open, so its local state resets on every open. */
function EditProjectForm({ projectId, name, description, onDone }: EditProjectFormProps) {
  const { mutate: updateProject, isPending } = useUpdateProject();
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio');
      return;
    }
    setError('');

    updateProject(
      { projectId, name: trimmedName, description: draftDescription.trim() },
      { onSuccess: onDone, onError: setError }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor={`edit-project-name-${projectId}`} className="text-xs text-muted-foreground">
          Nombre del Proyecto
        </Label>
        <Input
          id={`edit-project-name-${projectId}`}
          value={draftName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => {
            setDraftName(e.target.value);
            if (error) setError('');
          }}
          autoFocus
          className="bg-muted/50 border-border text-foreground text-xs rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor={`edit-project-description-${projectId}`}
          className="text-xs text-muted-foreground"
        >
          Descripción
        </Label>
        <Textarea
          id={`edit-project-description-${projectId}`}
          value={draftDescription}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => setDraftDescription(e.target.value)}
          rows={4}
          className="bg-muted/50 border-border text-foreground text-xs rounded-xl resize-none"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isPending}
          className="flex-1 border-border text-foreground/80 hover:bg-muted text-xs rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || !draftName.trim()}
          className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}

export function EditProjectDialog({ className, ...project }: EditProjectDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Editar proyecto ${project.name}`}
          className={
            className ??
            'text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors'
          }
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base">Editar Proyecto</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cambia el nombre o la descripción de tu proyecto.
          </DialogDescription>
        </DialogHeader>
        <EditProjectForm {...project} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
