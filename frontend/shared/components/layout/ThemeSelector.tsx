'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';

export function ThemeSelector() {
  const { mode, baseColor, activePresetId, presets, theme, toggleMode, setBaseColor, setPreset } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(baseColor);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sincroniza el customHex si cambia el color base
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el borrador con la prop
    setCustomHex(baseColor);
  }, [baseColor]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleHexChange = (value: string) => {
    setCustomHex(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setBaseColor(value);
    }
  };

  return (
    <div className="flex items-center gap-2" ref={popoverRef}>
      {/* Botón rápido Modo Claro / Oscuro */}
      <button
        type="button"
        onClick={toggleMode}
        className="p-2.5 rounded-xl border border-border bg-card/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-xs"
        aria-label={mode === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      >
        {mode === 'light' ? (
          <Moon className="w-4 h-4 text-foreground" aria-hidden="true" />
        ) : (
          <Sun className="w-4 h-4 text-warning" aria-hidden="true" />
        )}
      </button>

      {/* Botón trigger Selector de Gama */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="flex items-center gap-2 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl border border-border bg-card/60 hover:bg-muted text-foreground/80 hover:text-foreground transition-colors text-xs font-medium shadow-xs"
          aria-label="Personalizar gama de colores"
        >
          <div
            className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-xs"
            style={{ backgroundColor: theme.primary }}
          />
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tema</span>
        </button>

        {/* Popover / Menú */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl text-card-foreground">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: theme.sidebarAccent, color: theme.primary }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Paleta Inteligente</h4>
                  <p className="text-xs text-muted-foreground">Armonía cromática automática</p>
                </div>
              </div>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-md border border-border bg-muted/50 text-foreground/70"
              >
                {baseColor.toUpperCase()}
              </span>
            </div>

            {/* Presets curados */}
            <div className="mt-3">
              <p className="text-xs font-medium text-foreground/70 mb-2">Estilos Curados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {presets.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setPreset(preset.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-colors border ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-foreground font-medium shadow-xs'
                          : 'border-border/40 hover:border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: preset.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{preset.name}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Base Personalizado */}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs font-medium text-foreground/70 mb-2">Color Base Personalizado</p>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-border p-0.5"
                    aria-label="Seleccionar color base"
                  />
                </div>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#6366F1"
                  maxLength={7}
                  className="flex-1 px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Previsualizador de la Armonía Generada */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1.5">Gama armónica derivada</p>
              <div className="flex items-center gap-1.5 h-4 w-full rounded-md overflow-hidden p-0.5 bg-muted/40 border border-border">
                <div className="h-full flex-1 rounded-xs" style={{ backgroundColor: theme.chart1 }} title="Primario" />
                <div className="h-full flex-1 rounded-xs" style={{ backgroundColor: theme.chart2 }} title="Análogo" />
                <div className="h-full flex-1 rounded-xs" style={{ backgroundColor: theme.chart3 }} title="Triádico" />
                <div className="h-full flex-1 rounded-xs" style={{ backgroundColor: theme.chart4 }} title="Complementario" />
                <div className="h-full flex-1 rounded-xs" style={{ backgroundColor: theme.chart5 }} title="Acento" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
