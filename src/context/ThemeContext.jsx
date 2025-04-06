import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
    import { useLocalStorage } from '../hooks/useLocalStorage';

    const ThemeContext = createContext();

    export const useTheme = () => useContext(ThemeContext);

    export const ThemeProvider = ({ children }) => {
      const [themePreference, setThemePreference] = useLocalStorage('themePreference', 'auto'); // 'light', 'dark', 'auto'
      const [actualTheme, setActualTheme] = useState('light'); // 'light', 'dark'

      const calculateTheme = useCallback(() => {
        if (themePreference === 'auto') {
          const hour = new Date().getHours();
          // Simple time-based check: 6 AM to 6 PM is light, otherwise dark
          return (hour >= 6 && hour < 18) ? 'light' : 'dark';
        }
        return themePreference;
      }, [themePreference]);

      useEffect(() => {
        const newActualTheme = calculateTheme();
        setActualTheme(newActualTheme);
        document.documentElement.setAttribute('data-theme', newActualTheme);
      }, [themePreference, calculateTheme]);

      // Recalculate theme on preference change or (if auto) every 30 mins
      useEffect(() => {
        const intervalId = setInterval(() => {
          if (themePreference === 'auto') {
            const newActualTheme = calculateTheme();
            if (newActualTheme !== actualTheme) {
              setActualTheme(newActualTheme);
              document.documentElement.setAttribute('data-theme', newActualTheme);
            }
          }
        }, 30 * 60 * 1000); // Check every 30 minutes

        return () => clearInterval(intervalId);
      }, [themePreference, actualTheme, calculateTheme]);


      const value = {
        themePreference,
        setThemePreference,
        actualTheme,
      };

      return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
    };
    