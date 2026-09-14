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
    <div className="flex min-h-screen bg-[#0A1E3F] text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Dashboard
            </h2>
            <p className="text-white/60">
              Overview of all your projects and tasks
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
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B1A]" />
            </div>
          )}

          {projects && projects.length === 0 && (
            <div className="text-center py-20 bg-[#0D0D0D] border border-white/10 rounded-2xl p-12 mt-4">
              <p className="text-white/70 text-lg font-medium">No projects found</p>
              <p className="text-white/40 text-sm mt-2">
                Create your first project to get started
              </p>
              <div className="mt-6">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold px-5 py-2.5 rounded-lg shadow-md shadow-[#FF6B1A]/20 transition-all"
                >
                  Go to Projects
                </Link>
              </div>
            </div>
          )}

          {/* Proyectos recientes (máx 3) */}
          {projects && projects.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Recent Projects</h3>
                <Link href="/projects" className="text-sm font-medium text-[#FF6B1A] hover:underline flex items-center gap-1">
                  View all &rarr;
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0A1E3F]"><Loader2 className="w-8 h-8 animate-spin text-[#FF6B1A]" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
