import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('delivery_theme');
    return saved !== 'light'; // default dark
  });

  useEffect(() => {
    localStorage.setItem('delivery_theme', isDark ? 'dark' : 'light');
    // Drive Ionic's built-in dark class
    document.documentElement.classList.toggle('ion-palette-dark', isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Returns a complete set of color tokens for the current mode */
export function useTokens() {
  const { isDark } = useTheme();
  return isDark ? {
    appBg:        '#0A0A0A',
    headerBg:     '#111111',
    headerBorder: 'rgba(255,255,255,0.07)',
    surface:      '#1A1A1A',
    surface2:     '#242424',
    border:       'rgba(255,255,255,0.07)',
    text1:        '#F9FAFB',
    text2:        '#9CA3AF',
    text3:        '#6B7280',
    menuBg:       '#0F0F0F',
    menuItem:     '#D1D5DB',
    divider:      'rgba(255,255,255,0.07)',
    inputBg:      '#1C1C1C',
    inputBorder:  '#2D2D2D',
    tabInactive:  '#1C1C1C',
    tabText:      '#6B7280',
  } : {
    appBg:        '#F3F4F6',
    headerBg:     '#FFFFFF',
    headerBorder: 'rgba(0,0,0,0.08)',
    surface:      '#FFFFFF',
    surface2:     '#F9FAFB',
    border:       'rgba(0,0,0,0.08)',
    text1:        '#111827',
    text2:        '#4B5563',
    text3:        '#9CA3AF',
    menuBg:       '#F9FAFB',
    menuItem:     '#374151',
    divider:      'rgba(0,0,0,0.08)',
    inputBg:      '#F3F4F6',
    inputBorder:  '#D1D5DB',
    tabInactive:  '#E5E7EB',
    tabText:      '#6B7280',
  };
}
