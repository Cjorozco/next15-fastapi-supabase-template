'use client';

import { Header } from '@/components/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectProgressChart } from '@/components/ProjectProgressChart';
import { Sidebar } from '@/components/Sidebar';
import { StatsGrid } from '@/components/StatsGrid';
import { useProjects } from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';

import { Suspense } from 'react';
import Link from 'next/link';

function DashboardContent() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Dashboard
            </h2>
            <p className="text-slate-600">
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
              <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
            </div>
          )}

          {projects && projects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">No projects found</p>
              <p className="text-slate-400 text-sm mt-2">
                Create your first project to get started
              </p>
            </div>
          )}

          {/* Proyectos recientes (máx 3) */}
          {projects && projects.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-800">Recent Projects</h3>
                <Link href="/projects" className="text-sm font-medium text-slate-600 hover:text-slate-900">
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-900" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
