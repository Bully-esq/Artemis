import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/login.css'; // Import CSS for the login page
// import Button from '../components/common/Button'; // Remove button if not used

const Login = () => {
  const {
    isAuthenticated, 
    error, 
    loading, 
    isAuthReady, 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRendered = useRef(false);

  // Redirect path logic (remains the same)
  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/login') 
    ? location.state.from.pathname 
    : '/dashboard';

  // Redirect if already authenticated (remains the same)
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Login Page: User is authenticated, redirecting to", from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Render the Google Sign-In button (remains the same)
  useEffect(() => {
    if (isAuthReady && window.google && !googleButtonRendered.current) {
      const signInDiv = document.getElementById("signInDiv");
      if (signInDiv) {
          console.log("Login Page: Rendering Google Sign-In button.");
          window.google.accounts.id.renderButton(
              signInDiv,
              // Customizing button for better fit
              { theme: "filled_blue", size: "large", type: "standard", width: "300" } 
          );
          googleButtonRendered.current = true;
      } else {
          console.error("Login Page: signInDiv element not found for Google button.");
      }
    }
  }, [isAuthReady]);

  return (
    // Apply classes for layout and background
    <div className="login-page-container">
      {/* Card Container */}
      <div className="login-card">
        {/* Logo Container */}
        <div className="login-logo-container">
          {/* Use CSS for dark/light mode logos */}
          <img src="/logo-light.png" alt="Axton's Staircases Logo" className="login-logo logo-light" />
          <img src="/logo-dark.png" alt="Axton's Staircases Logo" className="login-logo logo-dark" />
        </div>
        
        {/* Title and Subtitle */}
        <h1 className="login-title">
          Sign In
        </h1>
        <p className="login-subtitle">
          Use your Google Account to access the dashboard
        </p>

        {/* Loading Spinner */} 
        {loading && (
          <div className="login-loading-container">
            {/* Simple spinner or use one from your base styles */}
            <div className="spinner"></div> 
            <span className="login-loading-text">Processing sign-in...</span>
          </div>
        )}

        {/* Error Message */} 
        {error && (
          <div className="login-error-container">
            <p>{typeof error === 'string' ? error : error.message || 'An unknown authentication error occurred.'}</p>
          </div>
        )}

        {/* Google Sign-In Button Placeholder */} 
        <div 
          id="signInDiv" 
          className="login-google-button-container"
        >
          {/* Show loading text before button renders */}
          {!isAuthReady && (
            <p className="login-google-loading-text">Loading Google Sign-In...</p> 
          )} 
        </div>

        {/* Footer Text */}
        <p className="login-footer-text">
          Need help? Contact support.
        </p>
        
      </div>
      {/* Optional: Add a footer outside the card */}
      {/* <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Axton's Staircases. All rights reserved.
      </footer> */}
    </div>
  );
};

export default Login;