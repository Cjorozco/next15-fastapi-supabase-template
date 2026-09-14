'use client';

import { useState } from 'react';
import { useCreateProject } from '@/domains/projects/hooks/useProjects';
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { PlusCircle, Loader2 } from 'lucide-react';

export function CreateProjectModal() {
  const [open, setOpen] = useState(false);
  const { mutate: createProject, isPending } = useCreateProject();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createProject({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    }, {
      onSuccess: () => {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:opacity-90 text-white font-medium shadow-md shadow-primary/20 rounded-xl">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base">Crear Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Nombre del Proyecto</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Rediseño de Plataforma"
              required
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-xs focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Breve descripción de los objetivos..."
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-xs focus:ring-primary focus:border-primary"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:opacity-90 text-white font-medium rounded-xl text-xs py-2 shadow-xs"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Proyecto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}