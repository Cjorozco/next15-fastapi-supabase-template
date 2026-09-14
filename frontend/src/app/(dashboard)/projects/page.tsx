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
    <div className="flex min-h-screen bg-[#0A1E3F] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Projects</h2>
              <p className="text-white/60">Manage and track all your projects</p>
            </div>
            <Button
              onClick={() => {
                setShowForm(true);
                setFormError('');
              }}
              className="bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold shadow-md shadow-[#FF6B1A]/20 transition-all"
              data-cy="new-project-btn"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          {/* Formulario de creación */}
          {showForm && (
            <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 mb-8 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/80">Project Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFormError(''); }}
                    placeholder="e.g. Website redesign"
                    required
                    autoFocus
                    className={`bg-[#0A1E3F] border border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FF6B1A] ${formError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    data-cy="project-name-input"
                  />
                  {formError && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white/80">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the project goals..."
                    rows={3}
                    className="bg-[#0A1E3F] border border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FF6B1A]"
                    data-cy="project-desc-input"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isCreating || !name.trim()}
                    data-cy="save-project-btn"
                    className="bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold"
                  >
                    {isCreating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      'Save Project'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white/80 hover:bg-white/10"
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
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B1A]" />
            </div>
          )}

          {/* Estado vacío — sin proyectos */}
          {!isLoading && projects?.length === 0 && (
            <div className="text-center py-20 bg-[#0D0D0D] border border-white/10 rounded-2xl p-12">
              <FolderKanban className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 text-lg font-medium">No projects yet</p>
              <p className="text-white/40 text-sm mt-1">
                Click <span className="font-semibold text-[#FF6B1A]">New Project</span> to get started
              </p>
            </div>
          )}

          {/* Sin resultados de búsqueda */}
          {!isLoading && projects && projects.length > 0 && filteredProjects?.length === 0 && (
            <div className="text-center py-20 bg-[#0D0D0D] border border-white/10 rounded-2xl p-12">
              <Search className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 text-lg font-medium">No results for &ldquo;{searchParams.get('q')}&rdquo;</p>
              <p className="text-white/40 text-sm mt-1">Try a different search term</p>
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
                      <div className="flex items-center gap-1 bg-[#0D0D0D] border border-red-500/40 rounded-lg shadow-lg p-1">
                        <span className="text-xs text-red-400 px-1">¿Borrar?</span>
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
                          className="text-xs text-white/60 hover:text-white px-2 py-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(project._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#0D0D0D] border border-white/15 rounded-lg p-1.5 hover:bg-red-500/20 hover:border-red-500/40 shadow-sm"
                        title="Borrar proyecto"
                      >
                        <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
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
