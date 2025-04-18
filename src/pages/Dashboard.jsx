import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ActionButtonContainer from '../components/common/ActionButtonContainer';
import CisDownloader from '../components/cis/CisDownloader';

// Contexts and Hooks
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// Services
import api, { apiClient } from '../services/api';

// CSS Import (can be removed later)
// import '../styles/pages/dashboard.css'; 

const Dashboard = () => {
  const navigate = useNavigate();
  const { settings, addNotification } = useAppContext();
  const { isAuthenticated, token } = useAuth();
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'
  const [retryCount, setRetryCount] = useState(0);
  const queryClient = useQueryClient();

  // Effect to reapply token to API requests if needed
  useEffect(() => {
    if (token) {
      // Ensure token is applied to all subsequent requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("Dashboard: Reapplied auth token to API client");
    }
  }, [token]);

  // Retry logic for API requests
  useEffect(() => {
    if (retryCount > 0 && isAuthenticated && token) {
      // Force a refetch of data
      setTimeout(() => {
        console.log("Retrying API requests after applying token...");
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries('quotes');
        queryClient.invalidateQueries('invoices');
      }, 500);
    }
  }, [retryCount, isAuthenticated, token, queryClient]);

  // Fetch data with React Query
  const { data: quotes, isLoading: quotesLoading, error: quotesError } = useQuery(
    'quotes', 
    api.quotes.getAll, 
    {
      onError: (error) => {
        console.error("Error fetching quotes:", error);
        if (error.response?.status === 401 && retryCount < 2) {
          console.log("Authentication error fetching quotes, retrying...");
          setRetryCount(prev => prev + 1);
        } else {
          addNotification(`Error fetching quotes: ${error.message}`, 'error');
        }
      },
      retry: 2,
      retryDelay: 1000,
      enabled: isAuthenticated
    }
  );

  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useQuery(
    'invoices', 
    api.invoices.getAll, 
    {
      onError: (error) => {
        console.error("Error fetching invoices:", error);
        if (error.response?.status === 401 && retryCount < 2) {
          console.log("Authentication error fetching invoices, retrying...");
          setRetryCount(prev => prev + 1);
        } else {
          addNotification(`Error fetching invoices: ${error.message}`, 'error');
        }
      },
      retry: 2,
      retryDelay: 1000,
      enabled: isAuthenticated
    }
  );

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Dashboard: Not authenticated, redirecting to login");
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    if (!invoices || !quotes) return {
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      quoteCount: 0,
      conversionRate: 0
    };

    const now = new Date();
    let startDate;
    
    // Set date range based on selected period
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    // Filter by period
    const periodInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate);
      return invoiceDate >= startDate && invoiceDate <= now;
    });

    const periodQuotes = quotes.filter(quote => {
      const quoteDate = new Date(quote.date);
      return quoteDate >= startDate && quoteDate <= now;
    });

    // Calculate metrics
    const totalInvoiced = periodInvoices.reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const totalPaid = periodInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (parseFloat(invoice.amount) || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    
    // Calculate quote conversion
    const invoicedClients = new Set(periodInvoices.map(invoice => invoice.clientName));
    const quotedClients = new Set(periodQuotes.map(quote => quote.clientName));
    const convertedClients = [...quotedClients].filter(client => invoicedClients.has(client));
    
    const conversionRate = quotedClients.size > 0 
      ? (convertedClients.length / quotedClients.size) * 100 
      : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoiceCount: periodInvoices.length,
      quoteCount: periodQuotes.length,
      conversionRate
    };
  };

  const metrics = calculateMetrics();

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Loading state
  if (quotesLoading || invoicesLoading) {
    return (
      <PageLayout title="Dashboard">
        <Loading message="Loading dashboard data..." />
      </PageLayout>
    );
  }

  // Render CIS Downloader only if CIS settings are available
  const renderCisDownloader = () => {
    if (settings?.cis?.enabled) {
      return (
        <div className="bg-card-background rounded-lg p-6 shadow-md transition-colors duration-300 ease-linear">
          <CisDownloader />
        </div>
      );
    }
    return null;
  };

  return (
    <PageLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-text-primary">Welcome to your Dashboard</h1>
        <p className="text-sm text-text-secondary">Here's what's happening with your business</p>
      </div>

      {/* Period selector */}
      <div className="mb-6">
        <ActionButtonContainer>
          <Button
            variant={period === 'week' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={period === 'month' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('month')}
          >
            Month
          </Button>
          <Button
            variant={period === 'year' ? 'primary' : 'secondary'}
            onClick={() => setPeriod('year')}
          >
            Year
          </Button>
        </ActionButtonContainer>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 mb-6">
        <div className="bg-card-background rounded-lg p-6 shadow-md transition-colors duration-300 ease-linear">
          <div className="flex items-center">
            <div className="p-3 rounded-full mr-4 flex items-center justify-center bg-green-500/20 text-success">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Invoiced</p>
              <p className="text-2xl font-bold text-text-primary my-2">{formatCurrency(metrics.totalInvoiced)}</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">{metrics.invoiceCount} invoices this {period}</p>
        </div>

        <div 
          className="bg-card-background rounded-lg p-6 shadow-md transition-all duration-200 ease-linear cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
          onClick={() => navigate('/invoices?status=overdue')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/invoices?status=overdue'); }}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-full mr-4 flex items-center justify-center bg-blue-500/20 text-info">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Outstanding</p>
              <p className="text-2xl font-bold text-text-primary my-2">{formatCurrency(metrics.totalOutstanding)}</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">
            {(metrics.totalPaid / metrics.totalInvoiced * 100 || 0).toFixed(1)}% collection rate
          </p>
        </div>

        <div className="bg-card-background rounded-lg p-6 shadow-md transition-colors duration-300 ease-linear">
          <div className="flex items-center">
            <div className="p-3 rounded-full mr-4 flex items-center justify-center bg-purple-500/20 text-primary-accent">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Quote Conversion</p>
              <p className="text-2xl font-bold text-text-primary my-2">{metrics.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4">{metrics.quoteCount} quotes this {period}</p>
        </div>

        {/* Render the CIS downloader card here if enabled */}
        {renderCisDownloader()}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-8">
        <button 
          onClick={() => navigate('/quotes/new')}
          className="block bg-card-background rounded-lg shadow-md p-6 text-center cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-background-tertiary"
        >
          <svg className="w-8 h-8 mx-auto mb-3 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-sm font-medium text-text-primary">New Quote</span>
        </button>

        <button 
          onClick={() => navigate('/invoices/new')}
          className="block bg-card-background rounded-lg shadow-md p-6 text-center cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-background-tertiary"
        >
          <svg className="w-8 h-8 mx-auto mb-3 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 9v4m0 4h.01" /></svg>
          <span className="text-sm font-medium text-text-primary">New Invoice</span>
        </button>

        <button 
          onClick={() => navigate('/contacts')}
          className="block bg-card-background rounded-lg shadow-md p-6 text-center cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-background-tertiary"
        >
          <svg className="w-8 h-8 mx-auto mb-3 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <span className="text-sm font-medium text-text-primary">Contacts</span>
        </button>

        <button 
          onClick={() => navigate('/suppliers')} 
          className="block bg-card-background rounded-lg shadow-md p-6 text-center cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:bg-background-tertiary"
        >
          <svg className="w-8 h-8 mx-auto mb-3 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1M13 16l2 4m2-4l-2 4M1 3h15v10H1z" /></svg>
          <span className="text-sm font-medium text-text-primary">Suppliers</span>
        </button>
      </div>

    </PageLayout>
  );
};

export default Dashboard;