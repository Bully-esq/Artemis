import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

// Contexts and Hooks
import { useAppContext } from '../context/AppContext';

// Services
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'

  // Fetch data with React Query
  const { data: quotes, isLoading: quotesLoading } = useQuery('quotes', api.quotes.getAll, {
    onError: (error) => {
      addNotification(`Error fetching quotes: ${error.message}`, 'error');
    }
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery('invoices', api.invoices.getAll, {
    onError: (error) => {
      addNotification(`Error fetching invoices: ${error.message}`, 'error');
    }
  });

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
        <h1 className="text-2xl font-bold mb-2">Welcome to your Dashboard</h1>
        <p className="text-gray-600">Here's what's happening with your business</p>
      </div>

      {/* Period selector */}
      <div className="mb-6">
        <div className="filter-buttons">
          <button
            type="button"
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`btn ${period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('year')}
          >
            Year
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Invoiced</p>
              <p className="stat-number">{formatCurrency(metrics.totalInvoiced)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">{metrics.invoiceCount} invoices this {period}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Outstanding</p>
              <p className="stat-number">{formatCurrency(metrics.totalOutstanding)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {(metrics.totalPaid / metrics.totalInvoiced * 100 || 0).toFixed(1)}% collection rate
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Quotes Created</p>
              <p className="stat-number">{metrics.quoteCount}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {metrics.conversionRate.toFixed(1)}% conversion rate
          </p>
        </div>
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
                      <p className="font-medium text-gray-900">
                        {quote.clientName || 'Unnamed Client'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.name || `Quote #${quote.id.substring(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {quote.date ? new Date(quote.date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
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
                      <p className="font-medium text-gray-900">
                        {invoice.clientName || 'Unnamed Client'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.invoiceNumber || `Invoice #${invoice.id.substring(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <p className={`text-sm ${
                        invoice.status === 'paid' 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Outstanding'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
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