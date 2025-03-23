import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

// Components
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

// Contexts and Hooks
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// Services
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const { data: contacts, isLoading: contactsLoading } = useQuery('contacts', api.contacts.getAll, {
    onError: (error) => {
      addNotification(`Error fetching contacts: ${error.message}`, 'error');
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
    // This is a simple estimate - assumes quotes and invoices with same client are related
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

  // Action buttons for creating new items
  const actionButtons = [
    { label: 'New Quote', icon: 'document-text', action: () => navigate('/quotes/new') },
    { label: 'New Invoice', icon: 'document', action: () => navigate('/invoices/new') },
    { label: 'Add Contact', icon: 'user-add', action: () => navigate('/contacts/new') }
  ];

  // Render icon based on name
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'document-text':
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'user-add':
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Loading state
  if (quotesLoading || invoicesLoading || contactsLoading) {
    return (
      <PageLayout title="Dashboard">
        <Loading message="Loading dashboard data..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user?.name || 'Steve'}</h1>
        <p className="text-gray-600">Here's what's happening with your business</p>
      </div>

      {/* Period selector */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex shadow-sm rounded-md">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              period === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium ${
              period === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border-t border-b border-gray-300`}
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              period === 'year' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
            onClick={() => setPeriod('year')}
          >
            Year
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Invoiced</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalInvoiced)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">{metrics.invoiceCount} invoices this {period}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalOutstanding)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {(metrics.totalPaid / metrics.totalInvoiced * 100 || 0).toFixed(1)}% collection rate
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Quotes Created</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.quoteCount}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {metrics.conversionRate.toFixed(1)}% conversion rate
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actionButtons.map((button, index) => (
            <button
              key={index}
              className="flex items-center justify-center p-6 bg-white rounded-lg shadow border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={button.action}
            >
              <div className="mr-3 text-blue-600">
                {renderIcon(button.icon)}
              </div>
              <span className="text-gray-800 font-medium">{button.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Quotes</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/quotes')}
            >
              View All
            </Button>
          </div>
          <div className="divide-y divide-gray-200">
            {quotes && quotes.length > 0 ? (
              quotes.slice(0, 5).map((quote) => (
                <div 
                  key={quote.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
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
              <div className="px-6 py-4 text-center text-gray-500">
                No recent quotes found
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/invoices')}
            >
              View All
            </Button>
          </div>
          <div className="divide-y divide-gray-200">
            {invoices && invoices.length > 0 ? (
              invoices.slice(0, 5).map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
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
              <div className="px-6 py-4 text-center text-gray-500">
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