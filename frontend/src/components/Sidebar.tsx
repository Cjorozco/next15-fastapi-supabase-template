'use client';

import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === href
      ? 'bg-slate-800 text-white'
      : 'text-slate-300 hover:bg-slate-800'
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Manager</h1>
        <p className="text-slate-400 text-sm mt-1 truncate">{user?.email}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link href="/" className={linkClass('/')} data-cy="nav-dashboard">
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/projects" className={linkClass('/projects')} data-cy="nav-projects">
          <FolderKanban className="w-5 h-5" />
          Projects
        </Link>
      </nav>

      <div className="pt-6 border-t border-slate-800">
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
          data-cy="sidebar-logout"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
        <p className="text-xs text-slate-600 mt-3">© 2026 Project Manager</p>
      </div>
    </aside>
  );
}
