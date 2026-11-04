'use client';

import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/shared/context/AuthContext';
import { useSidebarCollapsed } from '@/shared/lib/useSidebarCollapsed';

const NAV_ITEMS = [
  { href: '/hoy', label: 'Hoy', Icon: Sun },
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects', label: 'Proyectos', Icon: FolderKanban },
  { href: '/week', label: 'Esta semana', Icon: CalendarCheck },
] as const;

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  // `/projects/[id]` también cuenta como sección Proyectos
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `flex items-center rounded-xl font-medium transition-colors ${FOCUS_RING} ${
      collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
    } ${
      isActive(href)
        ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const toggleLabel = collapsed ? 'Expandir menú lateral' : 'Recoger menú lateral';
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <>
      {/* Escritorio: barra lateral (se puede recoger a solo íconos) */}
      <aside
        data-collapsed={collapsed}
        className={`relative hidden md:flex shrink-0 bg-sidebar border-r border-sidebar-border text-sidebar-foreground min-h-screen flex-col transition-[width,padding] duration-200 motion-reduce:transition-none ${
          collapsed ? 'w-[4.5rem] p-3' : 'w-64 p-6'
        }`}
      >
        {/* Botón en el borde del menú: no le quita espacio al título y no tapa nada. */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={toggleLabel}
          title={toggleLabel}
          className={`absolute -right-3.5 top-8 z-20 grid size-7 place-items-center rounded-full border border-sidebar-border dark:border-muted-foreground/40 bg-sidebar text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground ${FOCUS_RING}`}
        >
          <ToggleIcon className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className={`mb-8 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <>
              {/* Recogido: monograma de la marca en lugar del título */}
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-xl bg-primary/10 text-sm font-bold tracking-tight text-primary"
              >
                PM
              </span>
              <h1 className="sr-only">Project Manager</h1>
            </>
          ) : (
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Project <span className="text-primary">Manager</span>
              </h1>
              <p className="text-muted-foreground text-xs mt-1 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <nav id="sidebar-nav" aria-label="Principal" className="flex-1 space-y-2">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(href)}
              aria-current={isActive(href) ? 'page' : undefined}
              // Recogido: el texto se oculta, pero el nombre accesible y el tooltip se conservan.
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {collapsed ? <span className="sr-only">{label}</span> : label}
            </Link>
          ))}
        </nav>

        <div className={`pt-6 border-t border-sidebar-border ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            onClick={signOut}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={`flex items-center text-sm text-muted-foreground hover:text-primary transition-colors rounded ${FOCUS_RING} ${
              collapsed ? 'justify-center p-2.5 hover:bg-muted' : 'gap-2 w-full'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {collapsed ? <span className="sr-only">Cerrar sesión</span> : 'Cerrar sesión'}
          </button>
          {!collapsed && (
            <p className="text-xs text-muted-foreground mt-3">© 2026 Project Manager SaaS</p>
          )}
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
