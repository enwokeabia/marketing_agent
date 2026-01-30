import React from 'react';

/**
 * Sets `data-theme` early (before hydration) to avoid flashes.
 * If no stored theme exists, we leave `data-theme` unset so CSS can follow `prefers-color-scheme`.
 */
export function ThemeInitScript() {
  const code = `
(() => {
  try {
    const t = localStorage.getItem('ma-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.dataset.theme = t;
      document.documentElement.style.colorScheme = t;
    }
  } catch (e) {}
})();`.trim();

  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

