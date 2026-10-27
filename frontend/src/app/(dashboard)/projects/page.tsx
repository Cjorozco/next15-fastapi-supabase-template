'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/shared/components/layout/Header';
import { ProjectCard } from '@/domains/projects/components/ProjectCard';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { useProjects, useDeleteProject } from '@/domains/projects/hooks/useProjects';
import { Loader2, PlusCircle, FolderKanban, Trash2, Search } from 'lucide-react';
import { CreateProjectForm } from '@/domains/projects/components/CreateProjectForm';
import { GenerateProjectWithAiModal } from '@/domains/projects/components/GenerateProjectWithAiModal';
import { Button } from '@/shared/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';

export function ProjectsContent() {
  const { data: projects, isLoading } = useProjects();
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.toLowerCase() ?? '';
  const filteredProjects = useMemo(
    () =>
      projects?.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description ?? '').toLowerCase().includes(query)
      ),
    [projects, query]
  );
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<'projects'> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<Id<'projects'> | null>(null);

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

      <div className="flex-1 min-w-0 flex flex-col">
        <Header />

        <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8">
          {/* Encabezado */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Proyectos</h2>
              <p className="text-xs text-muted-foreground">Gestiona, organiza y monitorea todos tus proyectos</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <GenerateProjectWithAiModal />
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:opacity-90 text-primary-foreground font-medium text-xs rounded-xl shadow-md shadow-primary/20 transition-colors"
              >
                <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Nuevo Proyecto
              </Button>
            </div>
          </div>

          {/* Formulario de creación: su estado vive dentro del componente, no en la página */}
          {showForm && <CreateProjectForm onClose={() => setShowForm(false)} />}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Estado vacío — sin proyectos */}
          {!isLoading && projects?.length === 0 && (
            <div className="text-center py-20 bg-card border border-border rounded-2xl p-12 shadow-sm">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
              <p className="text-foreground text-base font-medium">No hay proyectos aún</p>
              <p className="text-muted-foreground text-xs mt-1 mb-6">
                Crea tu primer proyecto o genéralo automáticamente con IA
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <GenerateProjectWithAiModal />
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="border-border text-foreground text-xs rounded-xl"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Manualmente
                </Button>
              </div>
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
                  <div className="absolute top-4 right-12">
                    {confirmDeleteId === project._id ? (
                      <div className="flex items-center gap-1 bg-card border border-destructive/40 rounded-xl shadow-lg p-1" role="group" aria-label={`Confirmar borrado de ${project.name}`}>
                        <span className="text-xs text-destructive px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDelete(project._id)}
                          disabled={isDeleting && deletingId === project._id}
                          className="text-xs bg-destructive text-white px-3 py-2 rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {isDeleting && deletingId === project._id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(project._id)}
                        className="group/del opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity bg-card border border-border rounded-lg p-2.5 hover:bg-destructive/10 hover:border-destructive/30 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`Borrar proyecto ${project.name}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground group-hover/del:text-destructive" aria-hidden="true" />
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
