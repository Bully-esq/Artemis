import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * A logo component that switches between dark and light versions
 * based on the user's theme preference, respecting both manual and system settings.
 */
const ThemeAwareLogo = ({ className, alt, width, height, isTransparent = false, ...props }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const { actualTheme } = useTheme();

  useEffect(() => {
    // Only run this effect in browser environment
    if (typeof window === 'undefined') return;
    
    // Set base URL
    setBaseUrl(window.location.origin);
  }, []);
  
  // Use the appropriate logo based on the theme and transparency setting
  const logoSrc = isTransparent 
    ? `${baseUrl}/logo-light-t.png` 
    : `${baseUrl}${actualTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}`;
  
  return (
    <img 
      src={logoSrc} 
      className={`${className || ''}`}
      alt={alt || 'Logo'} 
      width={width}
      height={height}
      {...props}
    />
  );
};

export default ThemeAwareLogo; 