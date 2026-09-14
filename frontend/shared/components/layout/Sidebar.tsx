'use client';

import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      isActive
        ? 'bg-primary text-white font-semibold shadow-md shadow-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground min-h-screen p-6 flex flex-col transition-colors">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
          Project <span className="text-primary">Manager</span>
        </h1>
        <p className="text-muted-foreground text-xs mt-1 truncate">{user?.email}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link href="/" className={linkClass('/')}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/projects" className={linkClass('/projects')}>
          <FolderKanban className="w-5 h-5" />
          Proyectos
        </Link>
      </nav>

      <div className="pt-6 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
        <p className="text-[11px] text-muted-foreground/60 mt-3">© 2026 Project Manager SaaS</p>
      </div>
    </aside>
  );
}
