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

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/';

  // Tell AuthContext we're on the login page when component mounts
  useEffect(() => {
    // Only set the login page status if we're not being redirected from somewhere else
    // This prevents clearing the token during legitimate redirects after login
    if (!location.state?.from || location.state?.from?.pathname === '/login') {
      console.log('Setting login page status - not being redirected from protected route');
      setLoginPageStatus(true);
    } else {
      console.log('Not setting login page status - being redirected from:', location.state?.from);
    }
    
    return () => {
      // Reset the flag when we leave the login page
      console.log('Leaving login page, resetting login page status');
      setLoginPageStatus(false);
    };
  }, [setLoginPageStatus, location.state]);

  // Original token clearing logic is still useful as a backup
  useEffect(() => {
    // Only clear token if we're on the login page and not being redirected from elsewhere
    if (!location.state?.from) {
      console.log('Login page loaded, clearing authentication tokens');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // Also clear any API URL that might be causing issues
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
    // Disabling automatic API test on load - users can manually test instead
    // This prevents unnecessary network requests when the page loads
    
    // Set API status to unknown initially instead of trying to connect
    setApiStatus('unknown');
    apiChecked.current = true;
    
    /* Original automatic connectivity test code - now disabled
    const checkApiConnection = async () => {
      try {
        const connected = await testConnection(selectedApiEndpoint);
        setApiStatus(connected ? 'connected' : 'disconnected');
      } catch (err) {
        console.error('API check failed:', err);
        setApiStatus('error');
      }
      apiChecked.current = true;
    };
    
    checkApiConnection();
    */
  }, [selectedApiEndpoint, testConnection]); // Re-run when selected endpoint changes

  // Redirect if already authenticated
  useEffect(() => {
    console.log('Login.jsx - Redirect effect triggered:');
    console.log('- isAuthenticated:', isAuthenticated);
    console.log('- from path:', from);
    console.log('- token exists:', !!localStorage.getItem('token'));
    
    // Update auth debug info for the debug panel
    setAuthDebugInfo(prev => ({
      ...prev,
      isAuthenticatedValue: isAuthenticated,
      redirectTriggered: isAuthenticated,
      lastCheck: new Date().toISOString()
    }));
    
    if (isAuthenticated) {
      console.log('Navigating to:', from);
      // Add a small delay to ensure state is fully updated
      setTimeout(() => {
        navigate(from, { replace: true });
        console.log('Navigation command executed');
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
    
    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed', formErrors);
      return;
    }
    
    console.log('Attempting login with:', formData);
    console.log('Target API URL:', selectedApiEndpoint);
    
    try {
      // Update debugging state
      setAuthDebugInfo(prev => ({
        ...prev,
        lastLoginAttempt: new Date().toISOString(),
        loginStarted: true
      }));
      
      // Attempt login with the selected endpoint
      await login(formData.email, formData.password, selectedApiEndpoint);
      console.log('Login successful, should redirect to:', from);
      
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
          console.log('Still on login page after 1000ms - forcing navigation to dashboard...');
          navigate('/dashboard', { replace: true });
        }
      }, 1000);
    } catch (err) {
      // Auth errors are handled by the context
      console.error('Login failed in component:', err.message);
      
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 
            className="mt-6 text-center text-3xl font-extrabold text-gray-900" 
            onClick={handleTitleClick}
          >
            Welcome to Axton's Staircases
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Log in to your account to continue
          </p>
        </div>
        
        {/* Card container */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Show auth error if any */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Circuit breaker warning */}
          {circuitBroken && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Authentication temporarily disabled due to too many failed attempts. 
                    Please try again later.
                    {showDebugInfo && (
                      <button 
                        onClick={handleResetCircuitBreaker}
                        className="ml-2 text-xs underline text-yellow-800 hover:text-yellow-900"
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
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
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

          {/* Registration link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register now</Link>
            </p>
          </div>

          {/* API Connection Status */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col items-center text-sm">
              <div className="mb-2 flex items-center">
                <span className="mr-2">API Connection:</span>
                {apiStatus === 'connected' && (
                  <span className="text-green-600 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Connected
                  </span>
                )}
                {apiStatus === 'disconnected' && (
                  <span className="text-red-600 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Disconnected
                  </span>
                )}
                {apiStatus === 'checking' && (
                  <span className="text-yellow-600 flex items-center">
                    <svg className="h-4 w-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </span>
                )}
                {apiStatus === 'error' && (
                  <span className="text-red-600 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Connection Error
                  </span>
                )}
                {apiStatus === null && (
                  <span className="text-gray-600">Unknown</span>
                )}
              </div>
              <div className="flex flex-col items-center mb-2">
                <button 
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-500"
                  onClick={() => setShowApiConfig(!showApiConfig)}
                >
                  {showApiConfig ? 'Hide API Configuration' : 'Show API Configuration'}
                </button>
                
                {showApiConfig && (
                  <div className="mt-2 w-full">
                    <label htmlFor="api-endpoint" className="block text-xs font-medium text-gray-700">
                      API Endpoint
                    </label>
                    <select
                      id="api-endpoint"
                      name="api-endpoint"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      value={selectedApiEndpoint}
                      onChange={handleApiEndpointChange}
                    >
                      {API_ENDPOINTS.map((endpoint) => (
                        <option key={endpoint.url} value={endpoint.url}>
                          {endpoint.name} ({endpoint.url})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <button 
                  type="button" 
                  onClick={handleTestConnection}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                >
                  Test API connection
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {apiStatus === 'disconnected' && `Cannot connect to ${selectedApiEndpoint}. Try a different endpoint.`}
                {apiStatus === 'error' && "Connection blocked. Check console for details, might be CORS or ad blocker."}
              </p>
            </div>
          </div>
          
          {/* Debug Information - hidden by default, shown after 5 rapid taps on title */}
          {showDebugInfo && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs">
              <h3 className="font-medium text-gray-700">Debug Information</h3>
              <div className="mt-2 bg-gray-50 p-2 rounded overflow-auto max-h-40">
                <p>API URL: {selectedApiEndpoint}</p>
                <p>API Status: {apiStatus || 'unknown'}</p>
                <p>Circuit Breaker: {circuitBroken ? 'ACTIVE' : 'inactive'}</p>
                <p>Authentication Status:</p>
                <ul className="ml-4 list-disc">
                  <li>isAuthenticated: <span className={isAuthenticated ? "text-green-600 font-bold" : "text-red-600"}>{isAuthenticated ? "TRUE" : "false"}</span></li>
                  <li>Token exists: <span className={localStorage.getItem('token') ? "text-green-600 font-bold" : "text-red-600"}>{localStorage.getItem('token') ? "TRUE" : "false"}</span></li>
                  <li>Last login attempt: {authDebugInfo.lastLoginAttempt || 'none'}</li>
                  <li>Login successful: <span className={authDebugInfo.loginSuccessful ? "text-green-600 font-bold" : "text-red-600"}>{authDebugInfo.loginSuccessful ? "TRUE" : "false"}</span></li>
                  <li>Redirect triggered: <span className={authDebugInfo.redirectTriggered ? "text-green-600 font-bold" : "text-red-600"}>{authDebugInfo.redirectTriggered ? "TRUE" : "false"}</span></li>
                  <li>Last check: {authDebugInfo.lastCheck || 'none'}</li>
                </ul>
                <p>Session Storage:</p>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
                    ), 
                    null, 2
                  )}
                </pre>
                <p>Local Storage:</p>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.keys(localStorage).map(key => [key, 
                        key === 'token' ? '[REDACTED]' : localStorage.getItem(key)])
                    ), 
                    null, 2
                  )}
                </pre>
                <div className="mt-2">
                  <button 
                    className="text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                    onClick={() => {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }}
                  >
                    Clear Storage & Reload
                  </button>
                  <button 
                    className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 py-1 px-2 rounded"
                    onClick={() => setShowDebugInfo(false)}
                  >
                    Hide Debug Info
                  </button>
                  <button 
                    className="ml-2 text-xs bg-blue-200 hover:bg-blue-300 py-1 px-2 rounded"
                    onClick={() => {
                      navigate('/dashboard', { replace: true });
                    }}
                  >
                    Force Navigate to Dashboard
                  </button>
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