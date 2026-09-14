'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  THEME_PRESETS,
  ThemePreset,
  GeneratedTheme,
  generateHarmoniousTheme,
  applyThemeToDOM,
} from '@/shared/lib/themeEngine';

interface ThemeContextType {
  baseColor: string;
  activePresetId: string | null;
  theme: GeneratedTheme;
  presets: ThemePreset[];
  setBaseColor: (color: string) => void;
  setPreset: (presetId: string) => void;
}

const STORAGE_KEY_COLOR = 'pm_theme_base_color';
const STORAGE_KEY_PRESET = 'pm_theme_preset_id';
const DEFAULT_PRESET = THEME_PRESETS[0]; // Indigo Flow

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [baseColor, setBaseColorState] = useState<string>(DEFAULT_PRESET.color);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [isHydrated, setIsHydrated] = useState(false);

  // Carga inicial desde localStorage
  useEffect(() => {
    try {
      const savedColor = localStorage.getItem(STORAGE_KEY_COLOR);
      const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET);

      if (savedColor) {
        setBaseColorState(savedColor);
        setActivePresetId(savedPreset);
      }
    } catch {
      // Ignora errores si localStorage no está disponible
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Genera el tema reactivo según el color base
  const theme = useMemo(() => {
    return generateHarmoniousTheme(baseColor);
  }, [baseColor]);

  // Aplica las variables CSS al DOM en cada cambio
  useEffect(() => {
    if (isHydrated) {
      applyThemeToDOM(theme);
    }
  }, [theme, isHydrated]);

  const setBaseColor = useCallback((newColor: string) => {
    setBaseColorState(newColor);
    // Verifica si coincide exactamente con un preset
    const matchingPreset = THEME_PRESETS.find(
      (p) => p.color.toLowerCase() === newColor.toLowerCase()
    );
    const presetId = matchingPreset ? matchingPreset.id : null;
    setActivePresetId(presetId);

    try {
      localStorage.setItem(STORAGE_KEY_COLOR, newColor);
      if (presetId) {
        localStorage.setItem(STORAGE_KEY_PRESET, presetId);
      } else {
        localStorage.removeItem(STORAGE_KEY_PRESET);
      }
    } catch {
      // noop
    }
  }, []);

  const setPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setBaseColorState(preset.color);
      setActivePresetId(preset.id);
      try {
        localStorage.setItem(STORAGE_KEY_COLOR, preset.color);
        localStorage.setItem(STORAGE_KEY_PRESET, preset.id);
      } catch {
        // noop
      }
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        baseColor,
        activePresetId,
        theme,
        presets: THEME_PRESETS,
        setBaseColor,
        setPreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
