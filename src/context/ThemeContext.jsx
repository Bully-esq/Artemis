import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
// Remove useLocalStorage as theme preference comes from AppContext now
// import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAppContext } from './AppContext'; // Import AppContext

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Get settings from AppContext
  const { settings } = useAppContext();
  // Determine the preference from settings, defaulting to 'system'
  const themePreference = settings?.general?.theme || 'system'; 
  
  // Actual theme ('light' or 'dark') applied to the app
  const [actualTheme, setActualTheme] = useState('light'); 

  // Calculate theme based on preference and system setting
  const calculateTheme = useCallback(() => {
    // System preference check
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (themePreference === 'system') {
      return prefersDark ? 'dark' : 'light';
    }
    // If preference is explicitly 'light' or 'dark', use that
    return themePreference;
  }, [themePreference]); // Depends only on the preference derived from settings

  // Effect to apply the calculated theme to the document
  useEffect(() => {
    const newActualTheme = calculateTheme();
    setActualTheme(newActualTheme);
    // Apply the theme class to the root HTML element
    document.documentElement.setAttribute('data-theme', newActualTheme);
    console.log(`ThemeProvider: Applied data-theme='${newActualTheme}' based on preference '${themePreference}'`);

  }, [themePreference, calculateTheme]); // Recalculate when preference changes

  // Effect to listen for system theme changes ONLY if preference is 'system'
  useEffect(() => {
    let mediaQuery;
    let handleChange = () => {}; // Define handleChange outside the if block

    if (themePreference === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Define listener function
      handleChange = (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setActualTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        console.log(`ThemeProvider: System theme changed, applied data-theme='${newTheme}'`);
      };
      
      // Initial check is handled by the first useEffect
      // Add listener
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange); // Fallback
      }
    }
    
    // Clean up listener if it was added
    return () => {
      if (mediaQuery && themePreference === 'system') { // Ensure mediaQuery exists and preference is still system
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange); // Fallback
        }
      }
    };
  }, [themePreference]); // Re-run listener setup if preference changes to/from 'system'

  // We no longer expose setThemePreference; it's handled via AppContext/Settings page
  const value = {
    // themePreference, // No longer directly needed by consumers
    actualTheme, // Consumers might want to know the current actual theme
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
    