import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  AVATAR_TINTS_DARK,
  AVATAR_TINTS_LIGHT,
  AvatarTint,
  DARK_COLORS,
  LedgerColors,
  LedgerTypography,
  LIGHT_COLORS,
  makeTypography,
} from '@/design/tokens';
import { getAppPreference, setAppPreference } from '@/lib/actions';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_PREF_KEY = 'theme_mode';

interface AppThemeValue {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark';
  isDark: boolean;
  setMode: (next: ThemeMode) => void;
  C: LedgerColors;
  T: LedgerTypography;
  avatarTints: AvatarTint[];
}

const ThemeContext = createContext<AppThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await getAppPreference(THEME_PREF_KEY);
      if (!mounted) return;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setAppPreference(THEME_PREF_KEY, next);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const isDark = resolvedScheme === 'dark';

  const value = useMemo<AppThemeValue>(() => {
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    return {
      mode,
      resolvedScheme,
      isDark,
      setMode,
      C: colors,
      T: makeTypography(colors),
      avatarTints: isDark ? AVATAR_TINTS_DARK : AVATAR_TINTS_LIGHT,
    };
  }, [isDark, mode, resolvedScheme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      mode: 'light',
      resolvedScheme: 'light',
      isDark: false,
      setMode: () => {},
      C: LIGHT_COLORS,
      T: makeTypography(LIGHT_COLORS),
      avatarTints: AVATAR_TINTS_LIGHT,
    };
  }
  return ctx;
}
