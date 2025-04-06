// Theme handler for dynamic logo switching
(function() {
  // Function to update favicons based on color scheme
  function updateFavicons(isDarkMode) {
    // Get the base URL - ensures it works on all routes
    const baseUrl = window.location.origin;
    
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = isDarkMode ? 
        baseUrl + '/logo-dark.png' : 
        baseUrl + '/logo-light.png';
    }
    
    // Update apple touch icon
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      appleIcon.href = isDarkMode ? 
        baseUrl + '/logo-dark.png' : 
        baseUrl + '/logo-light.png';
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
    
    // Also update whenever the URL changes (for SPA navigation)
    window.addEventListener('popstate', function() {
      updateFavicons(colorSchemeQuery.matches);
    });
  }
})(); 