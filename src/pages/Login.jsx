import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';

// Define available API endpoints
const API_ENDPOINTS = [
  { url: 'https://app.uncharted.social/api', name: 'Production Server' }
];

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [apiStatus, setApiStatus] = useState(null); 
  const apiChecked = useRef(false);
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState(
    localStorage.getItem('selectedApiEndpoint') || API_ENDPOINTS[0].url
  );
  const [showApiConfig, setShowApiConfig] = useState(false);
  
  // Add debug mode state
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const debugTapCount = useRef(0);
  const lastDebugTap = useRef(0);
  
  // Add authentication debug state
  const [authDebugInfo, setAuthDebugInfo] = useState({
    lastLoginAttempt: null,
    redirectTriggered: false,
    isAuthenticatedValue: false
  });

  const { 
    login, 
    isAuthenticated, 
    error, 
    clearError, 
    loading, 
    testConnection, 
    resetCircuitBreaker,
    circuitBroken,
    setLoginPageStatus // Add this new function from AuthContext
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const intentionalLogin = useRef(false);

  // Get redirect path from location state or default to dashboard
  // Ensure the path always starts with a forward slash
  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/login') 
    ? location.state.from.pathname 
    : '/dashboard';

  // Tell AuthContext we're on the login page when component mounts
  useEffect(() => {
    // Only set the login page status if we're not being redirected from somewhere else
    // This prevents clearing the token during legitimate redirects after login
    if (!location.state?.from || location.state?.from?.pathname === '/login') {
      // console.log('Setting login page status - not being redirected from protected route');
      setLoginPageStatus(true);
    } else {
      // console.log('Not setting login page status - being redirected from:', location.state?.from);
    }
    
    return () => {
      // Reset the flag when we leave the login page
      // console.log('Leaving login page, resetting login page status');
      setLoginPageStatus(false);
    };
  }, [setLoginPageStatus, location.state]);

  // Modified token clearing logic - only clear when explicitly logging out or first app load
  useEffect(() => {
    // ONLY clear tokens if:
    // 1. We're on the login page without being redirected from a protected route AND
    // 2. We don't have an active auth token (indicating a fresh visit or explicit logout)
    const isDirectLoginPageVisit = !location.state?.from;
    const hasNoActiveToken = !localStorage.getItem('token');
    
    if (isDirectLoginPageVisit && hasNoActiveToken) {
      // This is likely an explicit logout or first app visit
      // console.log('Login page loaded directly with no token - clearing any stale auth data');
      sessionStorage.removeItem('user');
      
      // API URL correction logic
      if (localStorage.getItem('selectedApiEndpoint') && 
          localStorage.getItem('selectedApiEndpoint').includes(':3001')) {
        // Update any references to port 3001 to use 3002 instead
        const currentEndpoint = localStorage.getItem('selectedApiEndpoint');
        const updatedEndpoint = currentEndpoint.replace(':3001', ':3002');
        localStorage.setItem('selectedApiEndpoint', updatedEndpoint);
      }
    }
  }, [location.state]);

  // Check API connectivity only once on component mount
  useEffect(() => {
    // Set API status to unknown initially instead of trying to connect
    setApiStatus('unknown');
    apiChecked.current = true;
  }, [selectedApiEndpoint, testConnection]); // Re-run when selected endpoint changes

  // Redirect if already authenticated
  useEffect(() => {
    // Update auth debug info for the debug panel
    setAuthDebugInfo(prev => ({
      ...prev,
      isAuthenticatedValue: isAuthenticated,
      redirectTriggered: isAuthenticated,
      lastCheck: new Date().toISOString()
    }));
    
    if (isAuthenticated) {
      // Add a small delay to ensure state is fully updated
      setTimeout(() => {
        // Always navigate to a valid route to prevent 404
        const navigateTo = from || '/dashboard';
        navigate(navigateTo, { replace: true });
      }, 100);
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      if (error) clearError();
    };
  }, [error, clearError]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field-specific error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Handle API endpoint change
  const handleApiEndpointChange = (e) => {
    const newEndpoint = e.target.value;
    setSelectedApiEndpoint(newEndpoint);
    localStorage.setItem('selectedApiEndpoint', newEndpoint);
    apiChecked.current = false; // Reset API check status
    setApiStatus('checking'); // Show checking status
    
    // Apply the new API URL to session storage for the auth context to use
    sessionStorage.setItem('apiBaseUrl', newEndpoint);
    
    // Reset errors
    if (error) clearError();
  };

  // Test API connectivity manually
  const handleTestConnection = async () => {
    setApiStatus('checking');
    try {
      const connected = await testConnection(selectedApiEndpoint);
      setApiStatus(connected ? 'connected' : 'disconnected');
    } catch (err) {
      console.error('Manual API check failed:', err);
      setApiStatus('error');
    }
  };

  // Handle debug mode activation with a secret tap pattern
  const handleTitleClick = () => {
    const now = Date.now();
    if (now - lastDebugTap.current < 500) { // Detect rapid taps
      debugTapCount.current++;
      if (debugTapCount.current >= 5) { // 5 rapid taps to enable debug mode
        setShowDebugInfo(true);
        debugTapCount.current = 0;
      }
    } else {
      debugTapCount.current = 1;
    }
    lastDebugTap.current = now;
  };

  // Reset circuit breaker manually (for debugging)
  const handleResetCircuitBreaker = () => {
    if (resetCircuitBreaker) {
      resetCircuitBreaker();
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous auth errors
    if (error) clearError();
    
    // Mark this as an intentional login attempt
    intentionalLogin.current = true;
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      // Update debugging state
      setAuthDebugInfo(prev => ({
        ...prev,
        lastLoginAttempt: new Date().toISOString(),
        loginStarted: true
      }));
      
      // Attempt login with the selected endpoint
      await login(formData.email, formData.password, selectedApiEndpoint);
      
      // Update debug info
      setAuthDebugInfo(prev => ({
        ...prev,
        loginSuccessful: true,
        tokenExists: !!localStorage.getItem('token')
      }));
      
      // Save email in localStorage if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Add a manual navigation as a backup
      setTimeout(() => {
        if (document.location.pathname === '/login') {
          // Always navigate to the dashboard as a safe fallback
          navigate('/dashboard', { replace: true });
        }
      }, 1000);
    } catch (err) {
      // Auth errors are handled by the context
      
      // Update debug info
      setAuthDebugInfo(prev => ({
        ...prev,
        loginSuccessful: false,
        loginErrorMessage: err.message
      }));
    }
  };

  // Load remembered email if exists
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  return (
    // Use theme background
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 
            // Use theme text color
            className="mt-6 text-center text-3xl font-extrabold text-text-primary"
            onClick={handleTitleClick} // Keep debug tap handler
          >
            Welcome to Axton's Staircases
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Log in to your account to continue
          </p>
        </div>
        
        {/* Card container - Use standard theme card styling */}
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm py-8 px-4 sm:px-10">
          {/* Show auth error if any - Use theme danger colors */}
          {error && (
            <div className="mb-4 bg-danger-bg-light border-l-4 border-danger-border p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-danger-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-danger-text">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Circuit breaker warning - Use theme warning colors */}
          {circuitBroken && (
            <div className="mb-4 bg-warning-bg-light border-l-4 border-warning-border p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-warning-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-warning-text">
                    Authentication temporarily disabled due to too many failed attempts. 
                    Please try again later.
                    {showDebugInfo && (
                      <button 
                        onClick={handleResetCircuitBreaker}
                        // Use theme link styling for the reset button
                        className="ml-2 text-xs underline text-link hover:text-link-hover font-medium"
                      >
                        Reset Circuit Breaker
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              error={formErrors.email}
              required
              autoComplete="email"
              // Ensure FormField uses theme styles internally
            />
            
            <FormField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={formErrors.password}
              required
              autoComplete="current-password"
               // Ensure FormField uses theme styles internally
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  // Use consistent themed checkbox style
                  className="h-4 w-4 rounded border-input-border text-primary bg-input-background focus:ring-primary focus:ring-offset-0 focus:ring-2 transition duration-150 ease-in-out shadow-sm"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                {/* Use theme text color and Tailwind margin */}
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                 {/* Use theme link styles */}
                <a href="#" className="font-medium text-link hover:text-link-hover">
                  Forgot your password?
                </a>
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
                disabled={circuitBroken}
              >
                Sign in
              </Button>
            </div>
          </form>

          {/* Registration link - Use theme text/link colors */}
          <div className="mt-6 text-center text-sm">
            <p className="text-text-secondary">
              Don't have an account? <Link to="/register" className="font-medium text-link hover:text-link-hover">Register now</Link>
            </p>
          </div>

          {/* Debug Information - Apply theme styles */}
          {showDebugInfo && (
            <div className="mt-4 pt-4 border-t border-border-color text-xs">
              <h3 className="font-medium text-text-primary">Debug Information</h3>
              <div className="mt-2 bg-background-secondary p-2 rounded overflow-auto max-h-60">
                <p className="text-text-secondary">API URL: <span className="text-text-primary font-mono">{selectedApiEndpoint}</span></p>
                <p className="text-text-secondary">API Status: <span className="text-text-primary font-semibold">{apiStatus || 'unknown'}</span></p>
                <p className="text-text-secondary">Circuit Breaker: <span className={`font-semibold ${circuitBroken ? 'text-warning-text' : 'text-success-text'}`}>{circuitBroken ? 'ACTIVE' : 'inactive'}</span></p>
                <p className="text-text-secondary mt-1">Authentication Status:</p>
                <ul className="ml-4 list-disc text-text-secondary space-y-1">
                  <li>isAuthenticated: <span className={`font-bold ${isAuthenticated ? 'text-success-text' : 'text-danger-text'}`}>{isAuthenticated ? "TRUE" : "false"}</span></li>
                  <li>Token exists: <span className={`font-bold ${localStorage.getItem('token') ? 'text-success-text' : 'text-danger-text'}`}>{localStorage.getItem('token') ? "TRUE" : "false"}</span></li>
                  <li>Last login attempt: <span className="text-text-primary font-mono">{authDebugInfo.lastLoginAttempt || 'none'}</span></li>
                  <li>Login successful: <span className={`font-bold ${authDebugInfo.loginSuccessful ? 'text-success-text' : 'text-danger-text'}`}>{authDebugInfo.loginSuccessful ? "TRUE" : "false"}</span></li>
                  <li>Redirect triggered: <span className={`font-bold ${authDebugInfo.redirectTriggered ? 'text-success-text' : 'text-danger-text'}`}>{authDebugInfo.redirectTriggered ? "TRUE" : "false"}</span></li>
                  <li>Last check: <span className="text-text-primary font-mono">{authDebugInfo.lastCheck || 'none'}</span></li>
                </ul>
                <p className="text-text-secondary mt-2">Session Storage:</p>
                <pre className="text-xs overflow-auto bg-code-background p-2 rounded font-mono text-code-text">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
                    ), 
                    null, 2
                  )}
                </pre>
                <p className="text-text-secondary mt-2">Local Storage:</p>
                <pre className="text-xs overflow-auto bg-code-background p-2 rounded font-mono text-code-text">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.keys(localStorage).map(key => [key, 
                        key === 'token' ? '[REDACTED]' : localStorage.getItem(key)])
                    ), 
                    null, 2
                  )}
                </pre>
                {/* Use Button component for debug actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button 
                    variant="danger_outline"
                    size="xs"
                    onClick={() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }}
                  >
                    Clear Storage & Reload
                  </Button>
                  <Button 
                    variant="secondary"
                    size="xs"
                    onClick={() => setShowDebugInfo(false)}
                  >
                    Hide Debug Info
                  </Button>
                  <Button 
                    variant="info_outline"
                    size="xs"
                    onClick={() => {
                      navigate('/dashboard', { replace: true });
                    }}
                  >
                    Force Navigate to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;