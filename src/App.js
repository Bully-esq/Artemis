// App.js - With CSS import

import React from 'react';
import './App.css';  // Add CSS import
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Context providers
import { AppProvider } from './context/AppContext';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router>
          <div className="app-container">
            <Notifications />
            <NetworkStatus />
            
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Quotes */}
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/new" element={<QuoteBuilder />} />
              <Route path="/quotes/:id" element={<QuoteBuilder />} />
              
              {/* Invoices */}
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceBuilder />} />
              <Route path="/invoices/:id" element={<InvoiceBuilder />} />
              
              {/* Contacts */}
              <Route path="/contacts" element={<ContactList />} />
              <Route path="/contacts/:id" element={<ContactDetails />} />
              
              {/* Suppliers */}
              <Route path="/suppliers" element={<SupplierList />} />
              
              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              
              {/* Not Found */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate replace to="/404" />} />
            </Routes>
          </div>
        </Router>
      </AppProvider>
      
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;