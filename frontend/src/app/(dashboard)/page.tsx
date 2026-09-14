'use client';

import { Header } from '@/shared/components/layout/Header';
import { ProjectCard } from '@/domains/projects/components/ProjectCard';
import { ProjectProgressChart } from '@/domains/projects/components/ProjectProgressChart';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { StatsGrid } from '@/domains/dashboard/components/StatsGrid';
import { useProjects } from '@/domains/projects/hooks/useProjects';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import Link from 'next/link';

function DashboardContent() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">
              Dashboard
            </h2>
            <p className="text-xs text-white/50">
              Resumen ejecutivo de proyectos, métricas y avance de tareas
            </p>
          </div>

          {projects && projects.length > 0 && (
            <StatsGrid projects={projects} />
          )}

          {projects && projects.length > 0 && (
            <ProjectProgressChart projects={projects} />
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {projects && projects.length === 0 && (
            <div className="text-center py-20 bg-[#111827] border border-white/10 rounded-2xl p-12 mt-4">
              <p className="text-white/80 text-base font-medium">No se encontraron proyectos</p>
              <p className="text-white/40 text-xs mt-1">
                Crea tu primer proyecto para comenzar a gestionar tareas
              </p>
              <div className="mt-6">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 bg-primary hover:opacity-90 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md shadow-primary/20 transition-all"
                >
                  Ir a Proyectos
                </Link>
              </div>
            </div>
          )}

          {/* Proyectos recientes (máx 3) */}
          {projects && projects.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Proyectos Recientes</h3>
                <Link href="/projects" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  Ver todos &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 3).map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0B0F19]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
