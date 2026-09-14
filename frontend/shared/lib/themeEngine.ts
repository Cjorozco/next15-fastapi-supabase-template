export interface ThemePreset {
  id: string;
  name: string;
  color: string;
  description: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'indigo',
    name: 'Indigo Flow',
    color: '#6366F1',
    description: 'SaaS moderno, elegante y equilibrado',
  },
  {
    id: 'emerald',
    name: 'Emerald Apex',
    color: '#10B981',
    description: 'Fintech, analítica y crecimiento',
  },
  {
    id: 'sapphire',
    name: 'Ocean Sapphire',
    color: '#3B82F6',
    description: 'Enterprise, confianza y claridad',
  },
  {
    id: 'violet',
    name: 'Cyber Violet',
    color: '#8B5CF6',
    description: 'Developer-first, IA y creatividad',
  },
  {
    id: 'rose',
    name: 'Rose Horizon',
    color: '#F43F5E',
    description: 'Vibrante, audaz y contemporáneo',
  },
  {
    id: 'amber',
    name: 'Amber Velocity',
    color: '#F59E0B',
    description: 'Productividad, enfoque y energía',
  },
  {
    id: 'cyan',
    name: 'Cyan Pulse',
    color: '#06B6D4',
    description: 'Minimalista, técnico y futurista',
  },
];

export interface GeneratedTheme {
  primary: string;
  primaryHover: string;
  primaryRgb: string;
  primaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

// Convierte Hex a HSL
export function hexToHsl(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Convierte HSL a Hex
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255).toString(16);
    return val.length === 1 ? '0' + val : val;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convierte Hex a RGB string 'r g b'
export function hexToRgb(hex: string): string {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleaned.substring(0, 2), 16) || 0;
  const g = parseInt(cleaned.substring(2, 4), 16) || 0;
  const b = parseInt(cleaned.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

// Genera una paleta de colores armónicos completa a partir de un único color base
export function generateHarmoniousTheme(baseHex: string): GeneratedTheme {
  const [h, s, l] = hexToHsl(baseHex);

  // Asegura que la saturación y luminosidad sean óptimas para interfaces SaaS oscuras
  const primaryL = Math.min(Math.max(l, 45), 65);
  const primaryS = Math.min(Math.max(s, 50), 95);

  const primary = hslToHex(h, primaryS, primaryL);
  const primaryHover = hslToHex(h, primaryS, primaryL + (primaryL > 55 ? -8 : 8));
  const primaryRgb = hexToRgb(primary);

  // Paleta armónica para Recharts y estadísticas
  const chart1 = primary;
  const chart2 = hslToHex((h + 45) % 360, Math.min(primaryS, 85), 58);
  const chart3 = hslToHex((h + 130) % 360, Math.min(primaryS, 80), 55);
  const chart4 = hslToHex((h + 200) % 360, Math.min(primaryS, 85), 60);
  const chart5 = hslToHex((h + 280) % 360, Math.min(primaryS, 80), 62);

  return {
    primary,
    primaryHover,
    primaryRgb,
    primaryForeground: '#FFFFFF',
    sidebarAccent: `rgba(${primaryRgb}, 0.12)`,
    sidebarAccentForeground: primary,
    ring: primary,
    chart1,
    chart2,
    chart3,
    chart4,
    chart5,
  };
}

// Aplica el tema generado directamente a las variables CSS del documento
export function applyThemeToDOM(theme: GeneratedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-hover', theme.primaryHover);
  root.style.setProperty('--primary-foreground', theme.primaryForeground);
  root.style.setProperty('--sidebar-primary', theme.primary);
  root.style.setProperty('--sidebar-primary-foreground', theme.primaryForeground);
  root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', theme.sidebarAccentForeground);
  root.style.setProperty('--sidebar-ring', theme.ring);
  root.style.setProperty('--ring', theme.ring);
  root.style.setProperty('--chart-1', theme.chart1);
  root.style.setProperty('--chart-2', theme.chart2);
  root.style.setProperty('--chart-3', theme.chart3);
  root.style.setProperty('--chart-4', theme.chart4);
  root.style.setProperty('--chart-5', theme.chart5);
}
