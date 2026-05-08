// context/ThemeContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, Theme } from '../lib/theme';

const ThemeContext = createContext<{
  theme:       Theme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children:     React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme] = useState<Theme>('dark');

  // Theme is now forced to dark to maintain premium aesthetic
  useEffect(() => {
    applyTheme('dark');
  }, []);

  function toggleTheme() {
    // Disabled to maintain premium dark aesthetic
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
