import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
// import axios from 'axios'; // Remove axios
// import { apiClient } from '../services/api'; // Remove apiClient

// Removed getApiUrl - no longer needed for backend

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// --- Constants ---
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Or drive.appdata
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Will store Google profile { name, email, picture, id }
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false); // Tracks if GIS/GAPI setup is complete
  const [isGapiReady, setIsGapiReady] = useState(false); // Tracks if GAPI client/Drive API is loaded
  
  // Ref to prevent multiple initializations
  const gisInitialized = useRef(false);
  const gapiInitialized = useRef(false);

  // --- Google Identity Services (GIS) Initialization ---
  useEffect(() => {
    if (gisInitialized.current || !GOOGLE_CLIENT_ID) return; // Prevent re-init or init without ID
    
    gisInitialized.current = true;
    console.log('AuthContext: Initializing Google Identity Services (GIS)');
    
    window.google?.accounts?.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse, // Define this function to handle Sign In With Google button response
      // auto_select: true, // Optional: Attempts silent sign-in on first load
      // use_fedcm_for_prompt: true, // Optional: Use modern browser FedCM API if available
    });

    // Optionally render the Sign In With Google Button programmatically
    // Can also be done directly in the Login component
    // window.google?.accounts?.id.renderButton(
    //   document.getElementById("signInDiv"), // Ensure an element with this ID exists
    //   { theme: "outline", size: "large" } 
    // );

    // Prompt for consent immediately if needed (usually triggered by button click)
    // window.google?.accounts?.id.prompt(); 

    // Indicate that GIS is set up (Auth is "ready" in the sense that sign-in can be attempted)
    // The actual authenticated state depends on user interaction
    setIsAuthReady(true); 

  }, []); // Run once on mount

  // --- GAPI Client Initialization ---
  const initializeGapiClient = useCallback(async () => {
    if (gapiInitialized.current) return;
    gapiInitialized.current = true;
    console.log("AuthContext: Initializing Google API Client (GAPI)");
    try {
      await new Promise((resolve, reject) => {
        // Load the gapi client library
        window.gapi.load('client', {
          callback: resolve, // Resolve promise when loaded
          onerror: reject, // Reject on error
          timeout: 5000, // Timeout if library fails to load
          ontimeout: reject
        });
      });
      console.log("AuthContext: GAPI client library loaded.");
      
      // Load the Google Drive API
      await window.gapi.client.load(DISCOVERY_DOCS[0]);
      console.log("AuthContext: Google Drive API v3 loaded.");
      setIsGapiReady(true);
      
    } catch (err) {
      console.error("AuthContext: Error initializing GAPI client or Drive API:", err);
      setError("Could not initialize Google Drive connection. Please try again later.");
      // Potentially trigger logout or other cleanup if GAPI fails critically
      setIsGapiReady(false);
      gapiInitialized.current = false; // Allow retry?
    }
  }, []);

  // --- Authentication Handlers ---

  // Handle response from Sign In With Google button (ID Token)
  const handleCredentialResponse = useCallback(async (response) => {
    console.log("AuthContext: Received credential response (ID Token):", response);
    setLoading(true);
    setError(null);
    try {
      // Decode the ID token to get user profile information
      const idToken = response.credential;
      // Basic decoding (consider using a library for robust validation if needed)
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const profile = JSON.parse(jsonPayload);
      console.log("AuthContext: User profile from ID Token:", profile);

      const userData = {
          id: profile.sub, // Use Google's unique subject ID
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
      };
      setUser(userData);
      setIsAuthenticated(true);

      // Now that we have the ID Token, get the Access Token for Drive API
      // await requestDriveAccessToken(profile.sub); // <<< TEMPORARILY COMMENT OUT
      console.warn("AuthContext: Access token request is temporarily disabled for debugging.");
      // Since we are not getting the access token, GAPI won't be initialized here.
      // The user will be authenticated but isGapiReady will remain false.
      
    } catch (err) {
        console.error("AuthContext: Error handling credential response:", err);
        setError("Failed to process sign-in. Please try again.");
        setIsAuthenticated(false);
        setUser(null);
    } finally {
        setLoading(false);
    }
  }, []); // Add dependencies if needed, e.g., requestDriveAccessToken

  // Request Google Drive Access Token
  const requestDriveAccessToken = useCallback(async (userIdHint) => {
    console.log("AuthContext: Requesting Drive Access Token");
    try {
      const client = window.google?.accounts?.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        hint: userIdHint, // Optional: provide user ID hint
        callback: (tokenResponse) => { // Handle the response with the access token
          // Add extra check for error field in tokenResponse
          if (tokenResponse && tokenResponse.access_token && !tokenResponse.error) {
            console.log("AuthContext: Received Drive Access Token.");
            setGoogleAccessToken(tokenResponse.access_token);
            window.gapi.client.setToken(tokenResponse); // Set token for gapi client
            
            // Initialize GAPI now that we have the token
            // This check remains valid - only initialize if not already done
            if (!isGapiReady) {
              initializeGapiClient();
            }
          } else {
            // Handle cases where tokenResponse exists but access_token is missing or error is present
            const errorMessage = tokenResponse?.error_description || tokenResponse?.error || "Could not get permission to access Google Drive.";
            console.error("AuthContext: Failed to get Drive Access Token:", errorMessage, tokenResponse);
            setError(errorMessage);
            // Do NOT logout immediately here - let the user see the error
            // logout();
          }
        },
        error_callback: (error) => { // Handle errors during the token request flow
          console.error("AuthContext: Error requesting Drive Access Token (error_callback):", error);
          // Check for specific error types if needed (e.g., user closed popup)
          let displayError = `Error accessing Google Drive: ${error.message || 'Unknown error'}`;
          if (error.type === 'popup_closed') {
             displayError = "Google sign-in popup closed before completion.";
          } else if (error.type === 'popup_failed_to_open') {
             displayError = "Could not open Google sign-in popup. Please check your browser settings.";
          }
          setError(displayError);
          // Do NOT logout immediately - let the user see the error and potentially retry
          // logout();
        },
      });

      if (client) {
        // Request the access token
        console.log("AuthContext: Triggering client.requestAccessToken()");
        client.requestAccessToken(); // Request without forcing prompt
      } else {
         throw new Error("Google token client initialization failed.");
      }

    } catch (err) {
      console.error("AuthContext: Error setting up Drive Access Token request:", err);
      setError("Could not prepare Google Drive access request.");
      // Do NOT logout immediately
      // logout(); 
    }
  }, [initializeGapiClient]); // Keep only initializeGapiClient dependency

  // --- Sign Out ---
  const logout = useCallback(() => {
    console.log('AuthContext: Logging out...');
    setUser(null);
    setGoogleAccessToken(null);
    setIsAuthenticated(false);
    setIsGapiReady(false); // Reset GAPI status
    gapiInitialized.current = false; // Allow re-initialization if user logs back in
    setError(null);
    setLoading(false);

    // Clear gapi token if it exists
    if (window.gapi?.client?.getToken()) {
        window.gapi.client.setToken(null);
    }

    // Optionally revoke Google token if user is signed in via Google
    if (window.google && googleAccessToken) { // Check if google object exists and user was signed in
        try {
            // Revoke the token to sign the user out of the app session
            window.google.accounts.oauth2.revoke(googleAccessToken, () => {
                console.log('AuthContext: Google access token revoked.');
            });
        } catch (e) {
            console.error("AuthContext: Error revoking Google token:", e);
        }
    }
    
    // Clear any session/local storage if needed
    // localStorage.removeItem('some_app_key');
  }, [googleAccessToken]); // Dependency on accessToken


  // --- TODO: Remove Old Logic Below --- 

  // Old useEffect hooks for token/API URL/auth-failed - remove
  // Old loadUserData function - remove
  // Old login function - remove
  // Old register function - remove
  // Old updateProfile function - remove (or adapt for Google data if needed)
  // Old testConnection function - remove
  // Circuit breaker logic - remove (or adapt if Google sign-in shows similar issues)

  // --- Context Value ---
  const value = {
    user,
    isAuthenticated,
    isAuthReady,
    isGapiReady, // Expose GAPI status
    googleAccessToken, // Expose token if needed by other services (e.g., direct GAPI calls)
    loading,
    error,
    // Expose sign-in function (could be generic or specific)
    signInWithGoogle: requestDriveAccessToken, // Or handleCredentialResponse depending on flow
    logout,
    // clearError, // Keep if needed
    // resetCircuitBreaker, // Remove if circuit breaker is removed
    // updateProfile, // Keep/adapt if needed
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};