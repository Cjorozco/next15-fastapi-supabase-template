'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/shared/components/layout/Header';
import { ProjectCard } from '@/domains/projects/components/ProjectCard';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProjects, useCreateProject, useDeleteProject } from '@/domains/projects/hooks/useProjects';
import { Loader2, AlertCircle, PlusCircle, FolderKanban, Trash2, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Id } from '@/convex/_generated/dataModel';

export function ProjectsContent() {
  const { data: projects, isLoading } = useProjects();
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() ?? '';
  const filteredProjects = projects?.filter((p) =>
    p.name.toLowerCase().includes(query) ||
    (p.description ?? '').toLowerCase().includes(query)
  );
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<Id<'projects'> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<'projects'> | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setShowForm(false);
          setFormError('');
        },
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

  const handleDelete = (projectId: Id<'projects'>) => {
    setDeletingId(projectId);
    deleteProject(projectId, {
      onSuccess: () => {
        setDeletingId(null);
        setConfirmDeleteId(null);
      },
      onError: () => setDeletingId(null),
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Proyectos</h2>
              <p className="text-xs text-muted-foreground">Gestiona, organiza y monitorea todos tus proyectos</p>
            </div>
            <Button
              onClick={() => {
                setShowForm(true);
                setFormError('');
              }}
              className="bg-primary hover:opacity-90 text-white font-medium text-xs rounded-xl shadow-md shadow-primary/20 transition-all"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Button>
          </div>

          {/* Formulario de creación */}
          {showForm && (
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
                    className={`bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary ${formError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                  />
                  {formError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
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
                    disabled={isCreating || !name.trim()}
                    className="bg-primary hover:opacity-90 text-white font-medium text-xs rounded-xl"
                  >
                    {isCreating ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Guardando...</>
                    ) : (
                      'Guardar Proyecto'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-border text-foreground/80 hover:bg-muted text-xs rounded-xl"
                    onClick={() => { setShowForm(false); setName(''); setDescription(''); setFormError(''); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Estado vacío — sin proyectos */}
          {!isLoading && projects?.length === 0 && (
            <div className="text-center py-20 bg-card border border-border rounded-2xl p-12 shadow-sm">
              <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-foreground text-base font-medium">No hay proyectos aún</p>
              <p className="text-muted-foreground text-xs mt-1">
                Haz clic en <span className="font-semibold text-primary">Nuevo Proyecto</span> para comenzar
              </p>
            </div>
          )}

          {/* Sin resultados de búsqueda */}
          {!isLoading && projects && projects.length > 0 && filteredProjects?.length === 0 && (
            <div className="text-center py-20 bg-card border border-border rounded-2xl p-12 shadow-sm">
              <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-foreground text-base font-medium">No se encontraron resultados para &ldquo;{searchParams.get('q')}&rdquo;</p>
              <p className="text-muted-foreground text-xs mt-1">Intenta con otro término de búsqueda</p>
            </div>
          )}

          {/* Grid de proyectos */}
          {filteredProjects && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project._id} className="relative group">
                  <ProjectCard project={project} />

                  {/* Botón borrar — aparece al hacer hover */}
                  <div className="absolute top-4 right-4">
                    {confirmDeleteId === project._id ? (
                      <div className="flex items-center gap-1 bg-card border border-red-500/40 rounded-xl shadow-lg p-1">
                        <span className="text-xs text-red-500 px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDelete(project._id)}
                          disabled={isDeleting && deletingId === project._id}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting && deletingId === project._id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(project._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded-lg p-1.5 hover:bg-red-500/10 hover:border-red-500/30 shadow-xs"
                        title="Borrar proyecto"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsContent />
    </Suspense>
  );
}
