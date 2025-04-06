// Theme handler for dynamic logo switching
(function() {
  // Function to update favicons based on color scheme
  function updateFavicons(isDarkMode) {
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = isDarkMode ? 
        '%PUBLIC_URL%/logo-dark.png' : 
        '%PUBLIC_URL%/logo-light.png';
    }
    
    // Update apple touch icon
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      appleIcon.href = isDarkMode ? 
        '%PUBLIC_URL%/logo-dark.png' : 
        '%PUBLIC_URL%/logo-light.png';
    }
  }
  
  // Check if browser supports prefers-color-scheme
  if (window.matchMedia) {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set the initial favicon based on current preference
    updateFavicons(colorSchemeQuery.matches);
    
    // Add listener for theme changes
    colorSchemeQuery.addEventListener('change', (e) => {
      updateFavicons(e.matches);
    });
  }
})(); 