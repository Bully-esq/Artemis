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

  return (
    <PageLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 card-title">Welcome to your Dashboard</h1>
        <p className="list-item-subtitle">Here's what's happening with your business</p>
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
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="stat-icon stat-icon-green">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="stat-label">Invoiced</p>
              <p className="stat-number">{formatCurrency(metrics.totalInvoiced)}</p>
            </div>
          </div>
          <p className="stat-detail">{metrics.invoiceCount} invoices this {period}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="stat-icon stat-icon-blue">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="stat-label">Outstanding</p>
              <p className="stat-number">{formatCurrency(metrics.totalOutstanding)}</p>
            </div>
          </div>
          <p className="stat-detail">
            {(metrics.totalPaid / metrics.totalInvoiced * 100 || 0).toFixed(1)}% collection rate
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="stat-icon stat-icon-purple">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="stat-label">Quotes Created</p>
              <p className="stat-number">{metrics.quoteCount}</p>
            </div>
          </div>
          <p className="stat-detail">
            {metrics.conversionRate.toFixed(1)}% conversion rate
          </p>
        </div>

        {/* Conditionally render CIS Downloader Card based on settings */}
        {settings?.cis?.enabled && (
          <div className="stat-card">
            <CisDownloader mode="dashboard" />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <div onClick={() => navigate('/quotes/new')} className="quick-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>New Quote</span>
          </div>

          <div onClick={() => navigate('/invoices/new')} className="quick-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>New Invoice</span>
          </div>

          <div onClick={() => navigate('/contacts/new')} className="quick-action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <span>Add Contact</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Quotes</h2>
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={() => navigate('/quotes')}
            >
              View All
            </button>
          </div>
          <div className="recent-items">
            {quotes && quotes.length > 0 ? (
              quotes.slice(0, 5).map((quote) => (
                <div 
                  key={quote.id} 
                  className="recent-item"
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium list-item-title">
                        {quote.clientName || 'Unnamed Client'}
                      </p>
                      <p className="text-sm list-item-subtitle">
                        {quote.name || `Quote #${quote.id.substring(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium list-item-title">
                        {quote.date ? new Date(quote.date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center empty-state-description py-4">
                No recent quotes found
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Invoices</h2>
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={() => navigate('/invoices')}
            >
              View All
            </button>
          </div>
          <div className="recent-items">
            {invoices && invoices.length > 0 ? (
              invoices.slice(0, 5).map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="recent-item"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium list-item-title">
                        {invoice.clientName || 'Unnamed Client'}
                      </p>
                      <p className="text-sm list-item-subtitle">
                        {invoice.invoiceNumber || `Invoice #${invoice.id.substring(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium list-item-title">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <span className={`status-badge ${
                        invoice.status === 'paid' 
                          ? 'status-badge-success' 
                          : 'status-badge-warning'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Outstanding'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center empty-state-description py-4">
                No recent invoices found
              </div>
            )}
          </div>
        </div>
      </div>

    </PageLayout>
  );
};

export default Dashboard;