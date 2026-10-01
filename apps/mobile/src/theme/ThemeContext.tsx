import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import type { M3ColorScheme } from './m3Tokens';
import { M3Shapes, M3Typography, M3Motion } from './m3Tokens';
import { generateM3ColorScheme } from './paletteGenerator';

export type ThemeMode = 'system' | 'dark' | 'light';

interface ThemeContextType {
  colors: M3ColorScheme;
  shapes: typeof M3Shapes;
  typography: typeof M3Typography;
  motion: typeof M3Motion;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  seedColor: string;
  setSeedColor: (hex: string) => void;
  isDark: boolean;
}

const DEFAULT_SEED = '#C67D5A'; // Leon Bridges Warm Terracotta seed

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [seedColor, setSeedColorState] = useState<string>(DEFAULT_SEED);

  const setSeedColor = React.useCallback((hex: string) => {
    setSeedColorState((prev) => (prev.toLowerCase() === hex.toLowerCase() ? prev : hex));
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemScheme === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(() => {
    return generateM3ColorScheme(seedColor, isDark);
  }, [seedColor, isDark]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        shapes: M3Shapes,
        typography: M3Typography,
        motion: M3Motion,
        mode,
        setMode,
        seedColor,
        setSeedColor,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
