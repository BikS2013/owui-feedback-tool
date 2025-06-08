import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'blue' | 'green';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'dark';
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    // Check localStorage for saved color scheme preference
    const savedColorScheme = localStorage.getItem('colorScheme');
    return (savedColorScheme as ColorScheme) || 'blue';
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    // Save theme preference to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
  }, [theme, colorScheme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleColorScheme = () => {
    setColorScheme(prevScheme => prevScheme === 'blue' ? 'green' : 'blue');
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, toggleTheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}