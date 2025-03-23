import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Context providers
import { AppProvider } from '/context/AppContext.jsx';

// Pages
import Dashboard from './pages/Dashboard';
import QuoteList from './pages/QuoteList';
import QuoteBuilder from './pages/QuoteBuilder';
import InvoiceList from './pages/InvoiceList';
import InvoiceBuilder from './pages/InvoiceBuilder';
import ContactList from './pages/ContactList';
import ContactDetails from './pages/ContactDetails';
import Settings from '/pages/Settings';
import NotFound from './pages/NotFound';

// Components
import Notifications from './components/common/Notifications';
import NetworkStatusIndicator from './components/common/NetworkStatusIndicator';

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
          <Notifications />
          <NetworkStatusIndicator />
          
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Quotes */}
            <Route path="/quotes" element={<QuoteList />} />
            <Route path="/quotes/new" element={<QuoteBuilder />} />
            <Route path="/quotes/:id" element={<QuoteBuilder />} />
            
            {/* Invoices */}
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/new" element={<InvoiceBuilder />} />
            <Route path="/invoices/:id" element={<InvoiceBuilder />} />
            
            {/* Contacts */}
            <Route path="/contacts" element={<ContactList />} />
            <Route path="/contacts/:id" element={<ContactDetails />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Not Found */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate replace to="/404" />} />
          </Routes>
        </Router>
      </AppProvider>
      
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;