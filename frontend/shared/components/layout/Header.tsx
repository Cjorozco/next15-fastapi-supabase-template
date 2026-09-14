'use client';

import { Bell, Search, LogOut, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useAuth } from '@/shared/context/AuthContext';

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <header className="bg-[#0D0D0D] border-b border-white/10 px-8 py-4 text-white">
      <div className="flex items-center justify-between">
        {/* Búsqueda — solo visible en /projects */}
        <div className="flex-1 max-w-xl">
          {pathname === '/projects' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="global-search"
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-2 bg-[#0A1E3F] border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF6B1A] focus:border-transparent transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notificaciones */}
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative text-white/70 hover:text-white"
            title="Notificaciones"
            onClick={() => { }}
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Usuario — dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="user-menu-button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <div className="w-8 h-8 bg-[#FF6B1A] rounded-full flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <span className="text-sm font-medium text-white/90 max-w-[140px] truncate">
                {user?.email ?? 'Usuario'}
              </span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0D0D0D] border border-white/15 rounded-xl shadow-2xl py-1 z-50">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs text-white/40">Conectado como</p>
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                </div>
                <button
                  onClick={async () => { setDropdownOpen(false); await signOut(); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
