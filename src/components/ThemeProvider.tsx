import { createContext, useContext, useEffect, useState } from 'react';

import { logError } from '@/lib/utils';
import { themeSchema } from '@/schemas/settings';

/**
 *
 */
type Theme = 'dark' | 'light' | 'system';

/**
 *
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 *
 */
interface ThemeProviderState {
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const ThemeProviderContext = createContext<null | ThemeProviderState>(null);

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.defaultTheme
 * @param root0.storageKey
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => {
    // First check the new global settings storage
    try {
      const globalSettings = localStorage.getItem(
        'language-mate-global-settings'
      );
      if (globalSettings) {
        const parsed: unknown = JSON.parse(globalSettings);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'theme' in parsed &&
          typeof parsed.theme === 'string'
        ) {
          const themeParseResult = themeSchema.safeParse(parsed.theme);
          if (themeParseResult.success) {
            return themeParseResult.data;
          }
        }
      }
    } catch (error) {
      logError('Error loading theme from global settings:', error);
    }

    // Fallback to old theme storage
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const themeParseResult = themeSchema.safeParse(stored);
      if (themeParseResult.success) {
        return themeParseResult.data;
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(theme);
  }, [theme]);

  const value = {
    setTheme: (theme: Theme): void => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    theme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
