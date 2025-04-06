import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themePreference, setThemePreference] = useLocalStorage('themePreference', 'system'); // 'light', 'dark', 'system' (default now)
  const [actualTheme, setActualTheme] = useState('light'); // 'light', 'dark'

  // Calculate theme based on preference
  const calculateTheme = useCallback(() => {
    // For backward compatibility: treat 'auto' the same as 'system'
    const preference = themePreference === 'auto' ? 'system' : themePreference;
    
    if (preference === 'system') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preference;
  }, [themePreference]);

  useEffect(() => {
    const newActualTheme = calculateTheme();
    setActualTheme(newActualTheme);
    document.documentElement.setAttribute('data-theme', newActualTheme);
  }, [themePreference, calculateTheme]);

  // Listen for system theme changes if using 'system' or legacy 'auto' preference
  useEffect(() => {
    if (themePreference === 'system' || themePreference === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Initial check
      setActualTheme(mediaQuery.matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      
      // Define listener function
      const handleChange = (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setActualTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      };
      
      // Add listener with appropriate method based on browser support
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
      }
      
      // Clean up
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    }
  }, [themePreference]);

  // Wrapper for setThemePreference that handles migration from 'auto' to 'system'
  const setThemePreferenceWrapper = (newPreference) => {
    // If user or code tries to set 'auto', convert it to 'system'
    const preference = newPreference === 'auto' ? 'system' : newPreference;
    setThemePreference(preference);
  };

  const value = {
    themePreference,
    setThemePreference: setThemePreferenceWrapper,
    actualTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
    