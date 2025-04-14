// App.js - With modular CSS import and circuit breaker support

import React, { useEffect, useRef } from 'react';
import './styles/index.css';  // Updated to use our modular CSS structure
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Context providers
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // Import ThemeProvider

// Pages
import Dashboard from './pages/Dashboard';
import Quotes from './pages/Quotes';
import QuoteBuilder from './components/quotes/QuoteBuilder';
import InvoiceList from './components/invoices/InvoiceList';
import InvoiceBuilder from './components/invoices/InvoiceBuilder';
import ContactList from './components/contacts/ContactList';
import ContactDetails from './components/contacts/ContactDetails';
import SupplierList from './components/suppliers/SupplierList';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import Users from './pages/Users';

// Components
import { Notifications } from './components/common/Notification';
import NetworkStatus from './components/common/NetworkStatus';

// Sync Service
// import syncService from './services/syncService'; // Import the default export
import { syncAll, startAutoSync, stopAutoSync } from './services/syncService'; // Use named imports

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 300000, // 5 minutes
    },
  },
});

// Component to handle favicon updates on route changes
function FaviconUpdater() {
  const location = useLocation();

  useEffect(() => {
    // Update favicons when route changes
    const updateFavicons = () => {
      const isDarkMode = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const baseUrl = window.location.origin;
      
      // Update favicon
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.href = isDarkMode ? 
          `${baseUrl}/logo-dark.png?route=${location.pathname}` : 
          `${baseUrl}/logo-light.png?route=${location.pathname}`;
      }
      
      // Update apple touch icon
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = isDarkMode ? 
          `${baseUrl}/logo-dark.png?route=${location.pathname}` : 
          `${baseUrl}/logo-light.png?route=${location.pathname}`;
      }
    };
    
    updateFavicons();
  }, [location]);

  return null; // This component doesn't render anything
}

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isAuthReady } = useAuth();
  const location = useLocation();

  // If authentication status is not yet determined, show a spinner
  if (!isAuthReady) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

// Component to handle initialization of sync after auth + gapi is ready
function SyncInitializer() {
  const { isAuthenticated, isGapiReady } = useAuth();
  const syncStarted = useRef(false);
  const autoSyncInterval = useRef(null);

  useEffect(() => {
    if (isAuthenticated && isGapiReady && !syncStarted.current) {
      console.log("[App/SyncInitializer] User authenticated and GAPI ready. Triggering initial sync and starting auto-sync.");
      syncStarted.current = true;
      
      // Perform initial sync
      // syncService.syncAll().catch(error => {
      syncAll().catch(error => { // Call directly
        console.error("[App/SyncInitializer] Initial sync failed:", error);
        // Optionally notify the user about the initial sync failure
      });

      // Start auto-sync (e.g., every 5 minutes)
      const intervalMs = 5 * 60 * 1000; 
      // autoSyncInterval.current = syncService.startAutoSync(intervalMs);
      autoSyncInterval.current = startAutoSync(intervalMs); // Call directly
      
    } else if (!isAuthenticated && syncStarted.current) {
      // User logged out, stop auto-sync if it was running
      console.log("[App/SyncInitializer] User logged out. Stopping auto-sync.");
      if (autoSyncInterval.current) {
        // syncService.stopAutoSync(autoSyncInterval.current);
        stopAutoSync(autoSyncInterval.current); // Call directly
        autoSyncInterval.current = null;
      }
      syncStarted.current = false; // Reset flag for next login
    }

    // Cleanup function to stop auto-sync when component unmounts (e.g., app closes)
    return () => {
      if (autoSyncInterval.current) {
        console.log("[App/SyncInitializer] Component unmounting. Stopping auto-sync.");
        // syncService.stopAutoSync(autoSyncInterval.current);
        stopAutoSync(autoSyncInterval.current); // Call directly
      }
    };

  }, [isAuthenticated, isGapiReady]); // Rerun when auth or gapi status changes

  return null; // This component doesn't render anything
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <ThemeProvider> {/* Wrap app with ThemeProvider */}
            <Router>
              <div className="app-container">
                <FaviconUpdater /> {/* Add the FaviconUpdater component */}
                <Notifications />
                <NetworkStatus />
                <SyncInitializer /> {/* Add the Sync Initializer */}
                
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Quotes */}
                  <Route path="/quotes" element={
                    <ProtectedRoute>
                      <Quotes />
                    </ProtectedRoute>
                  } />
                  <Route path="/quotes/new" element={
                    <ProtectedRoute>
                      <QuoteBuilder />
                    </ProtectedRoute>
                  } />
                  <Route path="/quotes/:id" element={
                    <ProtectedRoute>
                      <QuoteBuilder />
                    </ProtectedRoute>
                  } />
                  
                  {/* Invoices */}
                  <Route path="/invoices" element={
                    <ProtectedRoute>
                      <InvoiceList />
                    </ProtectedRoute>
                  } />
                  <Route path="/invoices/new" element={
                    <ProtectedRoute>
                      <InvoiceBuilder />
                    </ProtectedRoute>
                  } />
                  <Route path="/invoices/:id" element={
                    <ProtectedRoute>
                      <InvoiceBuilder />
                    </ProtectedRoute>
                  } />
                  
                  {/* Contacts */}
                  <Route path="/contacts" element={
                    <ProtectedRoute>
                      <ContactList />
                    </ProtectedRoute>
                  } />
                  <Route path="/contacts/:id" element={
                    <ProtectedRoute>
                      <ContactDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Suppliers */}
                  <Route path="/suppliers" element={
                    <ProtectedRoute>
                      <SupplierList />
                    </ProtectedRoute>
                  } />
                  
                  {/* Settings */}
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  
                  {/* Users */}
                  <Route path="/users" element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  } />
                  
                  {/* Not Found */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate replace to="/404" />} />
                </Routes>
              </div>
            </Router>
          </ThemeProvider> {/* Close ThemeProvider */}
        </AppProvider>
      </AuthProvider>
      
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;