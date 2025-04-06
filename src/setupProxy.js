const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api', // Match requests starting with /api
    createProxyMiddleware({
      target: 'https://app.uncharted.social', // Forward them to this server
      changeOrigin: true, // Needed for virtual hosted sites
      // Optional: If your backend API path doesn't include /api, you might need pathRewrite
      // pathRewrite: {
      //   '^/api': '', // Rewrites '/api/settings' to '/settings' before forwarding
      // },
      onProxyReq: (proxyReq, req, res) => {
        // Check if the token exists in localStorage
        // Note: This assumes 'token' is the key used in your application
        const token = localStorage.getItem('token'); 
        if (token) {
          // Add the Authorization header to the proxied request
          proxyReq.setHeader('Authorization', `Bearer ${token}`);
          console.log(`[Proxy] Added Authorization header for: ${req.originalUrl}`);
        } else {
          console.log(`[Proxy] No token found for: ${req.originalUrl}`);
        }
        console.log(`[Proxy] Forwarding request: ${req.method} ${req.originalUrl} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[Proxy] Error:', err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy Error: Could not connect to the target API.');
      }
    })
  );
}; 