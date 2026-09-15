import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './theme-context-def';

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback if rendered outside ThemeProvider
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
};
