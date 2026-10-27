'use client';

import { LayoutDashboard, FolderKanban, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects', label: 'Proyectos', Icon: FolderKanban },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // `/projects/[id]` también cuenta como sección Proyectos
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
      isActive(href)
        ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="hidden md:flex w-64 shrink-0 bg-sidebar border-r border-sidebar-border text-sidebar-foreground min-h-screen p-6 flex-col transition-colors">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
            Project <span className="text-primary">Manager</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1 truncate">{user?.email}</p>
        </div>

        <nav aria-label="Principal" className="flex-1 space-y-2">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(href)}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t border-sidebar-border">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-full rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Cerrar sesión
          </button>
          <p className="text-xs text-muted-foreground mt-3">© 2026 Project Manager SaaS</p>
        </div>
      </aside>

      {/* Móvil: navegación inferior (el cierre de sesión vive en el menú de usuario del header) */}
      <nav
        aria-label="Principal"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
              isActive(href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
