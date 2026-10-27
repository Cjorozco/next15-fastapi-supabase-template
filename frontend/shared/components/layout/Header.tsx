'use client';

import { Search, LogOut, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { ThemeSelector } from './ThemeSelector';
import { DemoBanner } from './DemoBanner';

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);

  // Cierra el dropdown al hacer clic fuera o con Escape (devolviendo el foco al botón)
  useEffect(() => {
    if (!dropdownOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dropdownOpen]);

  // Al abrir el menú, el foco pasa a su primer elemento
  useEffect(() => {
    if (dropdownOpen) signOutRef.current?.focus();
  }, [dropdownOpen]);

  // Actualiza el query param ?q= en la URL para filtrar proyectos
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <>
    <DemoBanner />
    <header className="bg-card border-b border-border px-8 py-4 text-card-foreground transition-colors">
      <div className="flex items-center justify-between">
        {/* Búsqueda — solo visible en /projects */}
        <div className="flex-1 max-w-xl">
          {pathname === '/projects' && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="global-search"
                type="search"
                aria-label="Buscar proyectos"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Tema Inteligente y Modo */}
          <ThemeSelector />

          {/* Usuario — dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-menu-button"
              ref={menuButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              aria-controls="user-menu"
              aria-label={`Menú de usuario${user?.email ? `: ${user.email}` : ''}`}
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-xl border border-border transition-colors text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xs" aria-hidden="true">
                <span className="text-xs font-bold">{initials}</span>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[140px] truncate">
                {user?.email ?? 'Usuario'}
              </span>
              <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div
                id="user-menu"
                role="menu"
                aria-labelledby="user-menu-button"
                className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-2xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-popover-foreground"
              >
                <div role="none" className="px-4 py-2.5 border-b border-border">
                  <p className="text-xs text-muted-foreground">Conectado como</p>
                  <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                </div>
                <button
                  ref={signOutRef}
                  type="button"
                  role="menuitem"
                  onClick={async () => { setDropdownOpen(false); await signOut(); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
