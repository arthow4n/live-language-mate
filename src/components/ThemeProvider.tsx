import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

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
        if (parsed.theme) {
          console.log('🎨 Loading theme from global settings:', parsed.theme);
          return parsed.theme as Theme;
        }
      }
    } catch (error) {
      console.error('Error loading theme from global settings:', error);
    }

    // Fallback to old theme storage
    const stored = localStorage.getItem(storageKey);
    return (stored as Theme) || defaultTheme;
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
    theme,
    setTheme: (theme: Theme) => {
      console.log('🎨 Setting theme to:', theme);
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
