'use client';

import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
      pathname === href
        ? 'bg-[#FF6B1A] text-white font-semibold shadow-md shadow-[#FF6B1A]/20'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-[#0D0D0D] border-r border-white/10 text-white min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
          Project <span className="text-[#FF6B1A]">Manager</span>
        </h1>
        <p className="text-white/50 text-sm mt-1 truncate">{user?.email}</p>
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

      <div className="pt-6 border-t border-white/10">
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-[#FF6B1A] transition-colors w-full"
          data-cy="sidebar-logout"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
        <p className="text-xs text-white/30 mt-3">© 2026 Project Manager</p>
      </div>
    </aside>
  );
}
