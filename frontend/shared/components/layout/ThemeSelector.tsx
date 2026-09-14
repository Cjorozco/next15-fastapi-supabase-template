'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';

export function ThemeSelector() {
  const { baseColor, activePresetId, presets, theme, setBaseColor, setPreset } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(baseColor);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sincroniza el customHex si cambia el color base
  useEffect(() => {
    setCustomHex(baseColor);
  }, [baseColor]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHexChange = (value: string) => {
    setCustomHex(value);
    // Si es un hex válido de 6 caracteres con #
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setBaseColor(value);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botón trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-medium"
        title="Personalizar Gama de Colores"
        aria-label="Personalizar Gama de Colores"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: theme.primary }}
        />
        <Palette className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tema</span>
      </button>

      {/* Popover / Menú */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.sidebarAccent, color: theme.primary }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Paleta Inteligente</h4>
                <p className="text-[11px] text-white/50">Armonía cromática automática</p>
              </div>
            </div>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/10 text-white/70"
            >
              {baseColor.toUpperCase()}
            </span>
          </div>

          {/* Presets curados */}
          <div className="mt-3">
            <p className="text-xs font-medium text-white/70 mb-2">Estilos Curados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {presets.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setPreset(preset.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-all border ${
                      isSelected
                        ? 'border-white/30 bg-white/10 text-white font-medium shadow-sm'
                        : 'border-white/5 hover:border-white/15 hover:bg-white/5 text-white/70'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border border-white/20"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-white">{preset.name}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Base Personalizado */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs font-medium text-white/70 mb-2">Color Base Personalizado</p>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0.5"
                  title="Seleccionar color"
                />
              </div>
              <input
                type="text"
                value={customHex}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#6366F1"
                maxLength={7}
                className="flex-1 px-3 py-1.5 bg-[#0B0F19] border border-white/15 rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
          </div>

          {/* Previsualizador de la Armonía Generada */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[11px] text-white/50 mb-1.5">Gama armónica derivada</p>
            <div className="flex items-center gap-1.5 h-4 w-full rounded-md overflow-hidden p-0.5 bg-black/40 border border-white/10">
              <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: theme.chart1 }} title="Primario" />
              <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: theme.chart2 }} title="Análogo" />
              <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: theme.chart3 }} title="Triádico" />
              <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: theme.chart4 }} title="Complementario" />
              <div className="h-full flex-1 rounded-sm" style={{ backgroundColor: theme.chart5 }} title="Acento" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
