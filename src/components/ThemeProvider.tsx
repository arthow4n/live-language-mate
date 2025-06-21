import { createContext, useContext, useEffect, useState } from 'react';

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
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // First check the new global settings storage
    try {
      const globalSettings = localStorage.getItem(
        'language-mate-global-settings'
      );
      if (globalSettings) {
        const parsed = JSON.parse(globalSettings);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'theme' in parsed &&
          typeof parsed.theme === 'string'
        ) {
          const theme = parsed.theme;
          if (theme === 'dark' || theme === 'light' || theme === 'system') {
            console.log('🎨 Loading theme from global settings:', theme);
            return theme;
          }
        }
      }
    } catch (error) {
      console.error('Error loading theme from global settings:', error);
    }

    // Fallback to old theme storage
    const stored = localStorage.getItem(storageKey);
    if (
      stored &&
      (stored === 'dark' || stored === 'light' || stored === 'system')
    ) {
      return stored;
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

      console.log('🎨 Applying system theme:', systemTheme);
      root.classList.add(systemTheme);
      return;
    }

    console.log('🎨 Applying theme:', theme);
    root.classList.add(theme);
  }, [theme]);

  const value = {
    setTheme: (theme: Theme) => {
      console.log('🎨 Setting theme to:', theme);
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

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
