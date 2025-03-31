// App.js - With modular CSS import

import React from 'react';
import './styles/index.css';  // Updated to use our modular CSS structure
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Context providers
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

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

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // If authentication is still loading, show nothing (or a spinner)
  if (loading) {
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <Router>
            <div className="app-container">
              <Notifications />
              <NetworkStatus />
              
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
        </AppProvider>
      </AuthProvider>
      
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;