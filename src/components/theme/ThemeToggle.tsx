'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'focus-ring group inline-flex items-center gap-2 rounded-full border border-[var(--border)]',
        'bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)]/80 shadow-[var(--shadow-2)]',
        'backdrop-blur-xl transition will-change-transform hover:translate-y-[-1px] hover:text-[color:var(--foreground)]',
        className,
      ].join(' ')}
    >
      <span className="relative grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-solid)]">
        <Sun
          className={[
            'absolute h-4 w-4 transition-all duration-200',
            isDark ? 'scale-75 opacity-0 -rotate-45' : 'scale-100 opacity-90 rotate-0',
          ].join(' ')}
        />
        <Moon
          className={[
            'absolute h-4 w-4 transition-all duration-200',
            isDark ? 'scale-100 opacity-90 rotate-0' : 'scale-75 opacity-0 rotate-45',
          ].join(' ')}
        />
      </span>
      <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
      <span className="hidden sm:inline opacity-60 group-hover:opacity-80 transition">mode</span>
    </button>
  );
}

