import React, { useState, useEffect } from 'react';

/**
 * A logo component that automatically switches between dark and light versions
 * based on the user's system preference.
 */
const ThemeAwareLogo = ({ className, alt, width, height, ...props }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Only run this effect in browser environment
    if (typeof window === 'undefined') return;
    
    // Set base URL
    setBaseUrl(window.location.origin);
    
    // Set initial dark mode state
    setIsDarkMode(
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };
    
    // Modern browsers
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
      return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    } 
    // Older browsers (Safari)
    else if (darkModeMediaQuery.addListener) {
      darkModeMediaQuery.addListener(handleChange);
      return () => darkModeMediaQuery.removeListener(handleChange);
    }
  }, []);
  
  // Use the appropriate logo based on the theme
  const logoSrc = `${baseUrl}${isDarkMode ? '/logo-dark.png' : '/logo-light.png'}`;
  
  return (
    <img 
      src={logoSrc} 
      className={`theme-aware-logo ${className || ''}`}
      alt={alt || 'Logo'} 
      width={width}
      height={height}
      {...props}
    />
  );
};

export default ThemeAwareLogo; 