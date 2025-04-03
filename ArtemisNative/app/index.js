import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from 'react-query';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

// Contexts and Hooks
import { useAppContext } from '../src/context/AppContext';
import { useAuth } from '../src/context/AuthContext';

// Services
import api, { apiClient } from '../src/services/api';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// PageLayout component adapted for React Native
const PageLayout = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout?.();
    router.replace('/login');
  };

  return (
    <StyledView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-4 shadow-sm flex-row justify-between items-center">
        <StyledView className="flex-row items-center">
          <TouchableOpacity onPress={() => setSidebarOpen(true)} className="mr-2">
            <Ionicons name="menu-outline" size={24} color="#4B5563" />
          </TouchableOpacity>
          <StyledText className="text-xl font-bold text-gray-800">{title}</StyledText>
        </StyledView>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#4B5563" />
        </TouchableOpacity>
      </StyledView>

      {/* Main Content */}
      <StyledView className="flex-1">
        {children}
      </StyledView>

      {/* Sidebar Modal - would implement in a real app */}
      {/* For simplicity, we're not implementing the full sidebar in this example */}
    </StyledView>
  );
};

// Loading component
const Loading = ({ message = "Loading..." }) => (
  <StyledView className="flex-1 justify-center items-center bg-white">
    <ActivityIndicator size="large" color="#4F46E5" />
    <StyledText className="mt-4 text-gray-600">{message}</StyledText>
  </StyledView>
);

const Dashboard = () => {
  const router = useRouter();
  const { addNotification } = useAppContext() || { addNotification: () => {} };
  const { isAuthenticated, token } = useAuth() || { isAuthenticated: false, token: null };
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
        queryClient?.invalidateQueries('quotes');
        queryClient?.invalidateQueries('invoices');
      }, 500);
    }
  }, [retryCount, isAuthenticated, token, queryClient]);

  // Fetch data with React Query
  const { data: quotes, isLoading: quotesLoading, error: quotesError } = useQuery(
    'quotes', 
    api?.quotes?.getAll, 
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
    api?.invoices?.getAll, 
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
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

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
      <StyledScrollView className="flex-1 p-4">
        {/* Welcome message */}
        <StyledView className="mb-6">
          <StyledText className="text-2xl font-bold mb-2">Welcome to your Dashboard</StyledText>
          <StyledText className="text-gray-600">Here's what's happening with your business</StyledText>
        </StyledView>

        {/* Period selector */}
        <StyledView className="mb-6 flex-row justify-between bg-white rounded-lg p-1">
          <StyledTouchableOpacity 
            className={`px-4 py-2 rounded-md ${period === 'week' ? 'bg-blue-600' : 'bg-transparent'}`}
            onPress={() => setPeriod('week')}
          >
            <StyledText className={period === 'week' ? 'text-white' : 'text-gray-600'}>Week</StyledText>
          </StyledTouchableOpacity>
          
          <StyledTouchableOpacity 
            className={`px-4 py-2 rounded-md ${period === 'month' ? 'bg-blue-600' : 'bg-transparent'}`}
            onPress={() => setPeriod('month')}
          >
            <StyledText className={period === 'month' ? 'text-white' : 'text-gray-600'}>Month</StyledText>
          </StyledTouchableOpacity>
          
          <StyledTouchableOpacity 
            className={`px-4 py-2 rounded-md ${period === 'year' ? 'bg-blue-600' : 'bg-transparent'}`}
            onPress={() => setPeriod('year')}
          >
            <StyledText className={period === 'year' ? 'text-white' : 'text-gray-600'}>Year</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

        {/* Metrics Cards */}
        <StyledView className="mb-6">
          {/* Invoiced */}
          <StyledView className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <StyledView className="flex-row items-center">
              <StyledView className="p-3 rounded-full bg-green-100 mr-4">
                <Ionicons name="cash-outline" size={24} color="#059669" />
              </StyledView>
              <StyledView>
                <StyledText className="text-gray-500 text-sm font-medium">Invoiced</StyledText>
                <StyledText className="text-xl font-bold">{formatCurrency(metrics.totalInvoiced)}</StyledText>
              </StyledView>
            </StyledView>
            <StyledText className="text-sm text-gray-500 mt-4">
              {metrics.invoiceCount} invoices this {period}
            </StyledText>
          </StyledView>

          {/* Outstanding */}
          <StyledView className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <StyledView className="flex-row items-center">
              <StyledView className="p-3 rounded-full bg-blue-100 mr-4">
                <Ionicons name="wallet-outline" size={24} color="#2563EB" />
              </StyledView>
              <StyledView>
                <StyledText className="text-gray-500 text-sm font-medium">Outstanding</StyledText>
                <StyledText className="text-xl font-bold">{formatCurrency(metrics.totalOutstanding)}</StyledText>
              </StyledView>
            </StyledView>
            <StyledText className="text-sm text-gray-500 mt-4">
              {(metrics.totalPaid / metrics.totalInvoiced * 100 || 0).toFixed(1)}% collection rate
            </StyledText>
          </StyledView>

          {/* Quotes Created */}
          <StyledView className="bg-white p-4 rounded-lg shadow-sm">
            <StyledView className="flex-row items-center">
              <StyledView className="p-3 rounded-full bg-purple-100 mr-4">
                <Ionicons name="document-text-outline" size={24} color="#7C3AED" />
              </StyledView>
              <StyledView>
                <StyledText className="text-gray-500 text-sm font-medium">Quotes Created</StyledText>
                <StyledText className="text-xl font-bold">{metrics.quoteCount}</StyledText>
              </StyledView>
            </StyledView>
            <StyledText className="text-sm text-gray-500 mt-4">
              {metrics.conversionRate.toFixed(1)}% conversion rate
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Quick Actions */}
        <StyledView className="mb-8">
          <StyledText className="text-lg font-semibold mb-4">Quick Actions</StyledText>
          <StyledView className="flex-row justify-between">
            <StyledTouchableOpacity 
              className="bg-white p-4 rounded-lg items-center shadow-sm"
              style={{ width: '30%' }}
              onPress={() => router.push('/quotes/new')}
            >
              <Ionicons name="document-outline" size={24} color="#6B7280" />
              <StyledText className="text-sm text-center mt-2">New Quote</StyledText>
            </StyledTouchableOpacity>
            
            <StyledTouchableOpacity 
              className="bg-white p-4 rounded-lg items-center shadow-sm"
              style={{ width: '30%' }} 
              onPress={() => router.push('/invoices/new')}
            >
              <Ionicons name="receipt-outline" size={24} color="#6B7280" />
              <StyledText className="text-sm text-center mt-2">New Invoice</StyledText>
            </StyledTouchableOpacity>
            
            <StyledTouchableOpacity 
              className="bg-white p-4 rounded-lg items-center shadow-sm"
              style={{ width: '30%' }}
              onPress={() => router.push('/contacts/new')}
            >
              <Ionicons name="person-add-outline" size={24} color="#6B7280" />
              <StyledText className="text-sm text-center mt-2">Add Contact</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
        </StyledView>

        {/* Recent Quotes */}
        <StyledView className="mb-6">
          <StyledView className="flex-row justify-between items-center mb-4">
            <StyledText className="text-lg font-semibold">Recent Quotes</StyledText>
            <StyledTouchableOpacity onPress={() => router.push('/quotes')}>
              <StyledText className="text-blue-600">View All</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
          
          <StyledView className="bg-white rounded-lg shadow-sm overflow-hidden">
            {quotes && quotes.length > 0 ? (
              quotes.slice(0, 5).map((quote, index) => (
                <StyledTouchableOpacity 
                  key={quote.id}
                  onPress={() => router.push(`/quotes/${quote.id}`)}
                  className={`p-4 border-b border-gray-100 ${index === quotes.slice(0, 5).length - 1 ? 'border-b-0' : ''}`}
                >
                  <StyledView className="flex-row justify-between items-center">
                    <StyledView>
                      <StyledText className="font-medium text-gray-900">
                        {quote.clientName || 'Unnamed Client'}
                      </StyledText>
                      <StyledText className="text-sm text-gray-500">
                        {quote.name || `Quote #${quote.id.substring(0, 8)}`}
                      </StyledText>
                    </StyledView>
                    <StyledText className="text-gray-900">
                      {quote.date ? new Date(quote.date).toLocaleDateString() : 'No date'}
                    </StyledText>
                  </StyledView>
                </StyledTouchableOpacity>
              ))
            ) : (
              <StyledView className="p-4 items-center">
                <StyledText className="text-gray-500">No recent quotes found</StyledText>
              </StyledView>
            )}
          </StyledView>
        </StyledView>

        {/* Recent Invoices */}
        <StyledView className="mb-6">
          <StyledView className="flex-row justify-between items-center mb-4">
            <StyledText className="text-lg font-semibold">Recent Invoices</StyledText>
            <StyledTouchableOpacity onPress={() => router.push('/invoices')}>
              <StyledText className="text-blue-600">View All</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
          
          <StyledView className="bg-white rounded-lg shadow-sm overflow-hidden">
            {invoices && invoices.length > 0 ? (
              invoices.slice(0, 5).map((invoice, index) => (
                <StyledTouchableOpacity 
                  key={invoice.id}
                  onPress={() => router.push(`/invoices/${invoice.id}`)}
                  className={`p-4 border-b border-gray-100 ${index === invoices.slice(0, 5).length - 1 ? 'border-b-0' : ''}`}
                >
                  <StyledView className="flex-row justify-between items-center">
                    <StyledView>
                      <StyledText className="font-medium text-gray-900">
                        {invoice.clientName || 'Unnamed Client'}
                      </StyledText>
                      <StyledText className="text-sm text-gray-500">
                        {invoice.invoiceNumber || `Invoice #${invoice.id.substring(0, 8)}`}
                      </StyledText>
                    </StyledView>
                    <StyledView className="items-end">
                      <StyledText className="font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </StyledText>
                      <StyledText className={`text-sm ${
                        invoice.status === 'paid' 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Outstanding'}
                      </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledTouchableOpacity>
              ))
            ) : (
              <StyledView className="p-4 items-center">
                <StyledText className="text-gray-500">No recent invoices found</StyledText>
              </StyledView>
            )}
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </PageLayout>
  );
};

export default Dashboard; 