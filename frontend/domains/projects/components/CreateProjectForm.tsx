'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useCreateProject } from '@/domains/projects/hooks/useProjects';

interface CreateProjectFormProps {
  onClose: () => void;
}

/**
 * Inline "Crear Nuevo Proyecto" form.
 *
 * Field state is local to this component on purpose: when it lived in the projects
 * page, every keystroke re-rendered the whole page (all project cards with their
 * drag-and-drop contexts), which caused the slow INP on the description textarea.
 */
export function CreateProjectForm({ onClose }: CreateProjectFormProps) {
  const { mutate: createProject, isPending } = useCreateProject();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: onClose,
        onError: (err) => {
          setFormError(
            err.message.includes('already exists')
              ? 'Ya tienes un proyecto con ese nombre'
              : err.message
          );
        },
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-xl animate-in fade-in zoom-in-95 duration-150">
      <h3 className="text-base font-semibold text-foreground mb-4">Crear Nuevo Proyecto</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Nombre del Proyecto</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setFormError(''); }}
            placeholder="Ej: Rediseño de Plataforma"
            required
            autoFocus
            className={`bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary ${formError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {formError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {formError}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs text-muted-foreground">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve resumen de los objetivos..."
            rows={3}
            className="bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending || !name.trim()}
            className="bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Guardando...</>
            ) : (
              'Guardar Proyecto'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border text-foreground/80 hover:bg-muted text-xs rounded-xl"
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
