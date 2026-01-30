/* eslint-disable react-refresh/only-export-components */
'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = Theme | 'system';

const STORAGE_KEY = 'ma-theme';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(mode: ThemeMode, resolvedTheme: Theme) {
  const el = document.documentElement;
  if (mode === 'system') {
    el.removeAttribute('data-theme');
    el.style.colorScheme = resolvedTheme;
    return;
  }

  el.dataset.theme = mode;
  el.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>(() => (typeof window === 'undefined' ? 'light' : getSystemTheme()));

  // Initialize from localStorage (but keep "system" as the default).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setMode(saved);
    } catch {
      // ignore
    }
  }, []);

  // Track system theme changes while in "system" mode.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    const onChange = () => setResolvedTheme(getSystemTheme());
    onChange();

    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Apply current mode to the document, with minimal FOUC.
  useEffect(() => {
    applyThemeToDocument(mode, resolvedTheme);
  }, [mode, resolvedTheme]);

  const setModeAndPersist = useCallback((next: ThemeMode) => {
    setMode(next);
    try {
      if (next === 'system') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const current = mode === 'system' ? resolvedTheme : mode;
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    setModeAndPersist(next);
  }, [mode, resolvedTheme, setModeAndPersist]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode: setModeAndPersist, toggleTheme }),
    [mode, resolvedTheme, setModeAndPersist, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

