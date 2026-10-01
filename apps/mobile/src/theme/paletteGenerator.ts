import type { M3ColorScheme } from './m3Tokens';

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
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

  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  l = Math.max(0, Math.min(1, l));
  s = Math.max(0, Math.min(1, s));
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

  const rInt = Math.round((r + m) * 255);
  const gInt = Math.round((g + m) * 255);
  const bInt = Math.round((b + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rInt)}${toHex(gInt)}${toHex(bInt)}`;
}

/**
 * Generate full Material 3 Color Schemes (Light and Dark) from a seed hex color.
 * Faithfully maps M3 tonal roles (Primary, Surface, Container, etc.)
 */
export function generateM3ColorScheme(seedHex: string, isDark: boolean): M3ColorScheme {
  const rgb = hexToRgb(seedHex || '#C67D5A');
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const hue = hsl.h;
  const sat = Math.max(0.15, Math.min(0.65, hsl.s)); // Keep tasteful chroma

  if (isDark) {
    // Dark Theme Tones
    return {
      isDark: true,
      primary: hslToHex(hue, sat, 0.78),
      onPrimary: hslToHex(hue, sat, 0.15),
      primaryContainer: hslToHex(hue, sat, 0.28),
      onPrimaryContainer: hslToHex(hue, sat, 0.88),

      secondary: hslToHex((hue + 15) % 360, sat * 0.5, 0.72),
      onSecondary: hslToHex((hue + 15) % 360, sat * 0.5, 0.15),
      secondaryContainer: hslToHex((hue + 15) % 360, sat * 0.5, 0.24),
      onSecondaryContainer: hslToHex((hue + 15) % 360, sat * 0.5, 0.85),

      tertiary: hslToHex((hue + 45) % 360, sat * 0.6, 0.75),
      onTertiary: hslToHex((hue + 45) % 360, sat * 0.6, 0.15),
      tertiaryContainer: hslToHex((hue + 45) % 360, sat * 0.6, 0.26),
      onTertiaryContainer: hslToHex((hue + 45) % 360, sat * 0.6, 0.88),

      background: hslToHex(hue, sat * 0.12, 0.07),
      onBackground: hslToHex(hue, sat * 0.05, 0.90),

      surface: hslToHex(hue, sat * 0.10, 0.08),
      onSurface: hslToHex(hue, sat * 0.05, 0.90),
      surfaceVariant: hslToHex(hue, sat * 0.15, 0.18),
      onSurfaceVariant: hslToHex(hue, sat * 0.10, 0.75),

      surfaceContainerLowest: hslToHex(hue, sat * 0.10, 0.05),
      surfaceContainerLow: hslToHex(hue, sat * 0.10, 0.09),
      surfaceContainer: hslToHex(hue, sat * 0.10, 0.12),
      surfaceContainerHigh: hslToHex(hue, sat * 0.10, 0.16),
      surfaceContainerHighest: hslToHex(hue, sat * 0.10, 0.20),

      outline: hslToHex(hue, sat * 0.10, 0.45),
      outlineVariant: hslToHex(hue, sat * 0.10, 0.25),

      inverseSurface: hslToHex(hue, sat * 0.05, 0.90),
      inverseOnSurface: hslToHex(hue, sat * 0.05, 0.12),
      inversePrimary: hslToHex(hue, sat, 0.40),
    };
  } else {
    // Light Theme Tones
    return {
      isDark: false,
      primary: hslToHex(hue, sat, 0.36),
      onPrimary: '#FFFFFF',
      primaryContainer: hslToHex(hue, sat, 0.88),
      onPrimaryContainer: hslToHex(hue, sat, 0.12),

      secondary: hslToHex((hue + 15) % 360, sat * 0.5, 0.38),
      onSecondary: '#FFFFFF',
      secondaryContainer: hslToHex((hue + 15) % 360, sat * 0.5, 0.88),
      onSecondaryContainer: hslToHex((hue + 15) % 360, sat * 0.5, 0.14),

      tertiary: hslToHex((hue + 45) % 360, sat * 0.6, 0.35),
      onTertiary: '#FFFFFF',
      tertiaryContainer: hslToHex((hue + 45) % 360, sat * 0.6, 0.88),
      onTertiaryContainer: hslToHex((hue + 45) % 360, sat * 0.6, 0.12),

      background: hslToHex(hue, sat * 0.08, 0.98),
      onBackground: hslToHex(hue, sat * 0.08, 0.10),

      surface: hslToHex(hue, sat * 0.08, 0.98),
      onSurface: hslToHex(hue, sat * 0.08, 0.10),
      surfaceVariant: hslToHex(hue, sat * 0.12, 0.90),
      onSurfaceVariant: hslToHex(hue, sat * 0.10, 0.30),

      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: hslToHex(hue, sat * 0.08, 0.96),
      surfaceContainer: hslToHex(hue, sat * 0.08, 0.93),
      surfaceContainerHigh: hslToHex(hue, sat * 0.08, 0.90),
      surfaceContainerHighest: hslToHex(hue, sat * 0.08, 0.86),

      outline: hslToHex(hue, sat * 0.10, 0.50),
      outlineVariant: hslToHex(hue, sat * 0.10, 0.78),

      inverseSurface: hslToHex(hue, sat * 0.05, 0.15),
      inverseOnSurface: hslToHex(hue, sat * 0.05, 0.95),
      inversePrimary: hslToHex(hue, sat, 0.75),
    };
  }
}
