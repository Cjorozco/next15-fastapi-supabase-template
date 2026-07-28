'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Sidebar } from '@/components/Sidebar';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { Loader2, AlertCircle, PlusCircle, FolderKanban, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Id } from '../../../convex/_generated/dataModel';

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
    setFormError('');
    if (!name.trim()) return;

    createProject(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setShowForm(false);
        },
        onError: (err) => {
          setFormError(err.message || 'Error al crear el proyecto. Intenta de nuevo.');
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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-1">Projects</h2>
              <p className="text-slate-500">Manage and track all your projects</p>
            </div>
            <Button
              onClick={() => { setShowForm((v) => !v); setFormError(''); }}
              className="bg-slate-900 hover:bg-slate-700"
              data-cy="new-project-btn"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {showForm ? 'Cancel' : 'New Project'}
            </Button>
          </div>

          {/* Formulario de creación */}
          {showForm && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Project</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFormError(''); }}
                    placeholder="e.g. Website redesign"
                    required
                    autoFocus
                    className={formError ? 'border-red-400 focus-visible:ring-red-400' : ''}
                    data-cy="project-name-input"
                  />
                  {formError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the project goals..."
                    rows={3}
                    data-cy="project-desc-input"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={isCreating || !name.trim()} data-cy="save-project-btn">
                    {isCreating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      'Save Project'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowForm(false); setName(''); setDescription(''); setFormError(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
            </div>
          )}

          {/* Estado vacío — sin proyectos */}
          {!isLoading && projects?.length === 0 && (
            <div className="text-center py-20">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">No projects yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Click <span className="font-semibold">New Project</span> to get started
              </p>
            </div>
          )}

          {/* Sin resultados de búsqueda */}
          {!isLoading && projects && projects.length > 0 && filteredProjects?.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">No results for &ldquo;{searchParams.get('q')}&rdquo;</p>
              <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {/* Grid de proyectos */}
          {filteredProjects && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project._id} className="relative group" data-cy="project-card">
                  <ProjectCard project={project} />

                  {/* Botón borrar — aparece al hacer hover */}
                  <div className="absolute top-3 right-3">
                    {confirmDeleteId === project._id ? (
                      <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg shadow-sm p-1">
                        <span className="text-xs text-red-600 px-1">¿Borrar?</span>
                        <button
                          onClick={() => handleDelete(project._id)}
                          disabled={isDeleting && deletingId === project._id}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting && deletingId === project._id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(project._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg p-1.5 hover:bg-red-50 hover:border-red-300 shadow-sm"
                        title="Borrar proyecto"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
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
