import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create an axios instance
export const apiClient = axios.create({
  baseURL: 'https://app.uncharted.social/api', // Default API URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error adding token to request:', error);
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Handle different error types
    if (error.response) {
      // Server responded with an error status
      console.error('API Error Response:', error.response.status, error.response.data);
      
      // Handle 401 Unauthorized (token expired, etc.)
      if (error.response.status === 401) {
        // You might want to trigger a logout or token refresh here
        console.warn('Authentication error detected');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Request Error (No Response):', error.request);
    } else {
      // Error setting up the request
      console.error('API Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Set base URL from async storage on app start
const initializeApi = async () => {
  try {
    const apiBaseUrl = await AsyncStorage.getItem('apiBaseUrl');
    if (apiBaseUrl) {
      apiClient.defaults.baseURL = apiBaseUrl;
      console.log('API base URL set to:', apiBaseUrl);
    }
  } catch (error) {
    console.error('Error initializing API service:', error);
  }
};

// Initialize API configuration
initializeApi();

// Helper method to set a different base URL
export const setApiBaseUrl = async (url) => {
  if (url) {
    apiClient.defaults.baseURL = url;
    try {
      await AsyncStorage.setItem('apiBaseUrl', url);
    } catch (error) {
      console.error('Error saving API base URL:', error);
    }
  }
};

// API endpoints - mock implementations
const api = {
  // Quotes API
  quotes: {
    getAll: async () => {
      // For now, just return mock data
      return [
        { id: '1', name: 'Kitchen renovation', clientName: 'John Doe', date: '2023-01-15', amount: 5000 },
        { id: '2', name: 'Bathroom remodel', clientName: 'Jane Smith', date: '2023-02-20', amount: 3500 },
        { id: '3', name: 'Deck installation', clientName: 'Bob Johnson', date: '2023-03-10', amount: 2800 }
      ];
    },
    getById: async (id) => {
      // For now, just return mock data
      return { id, name: `Quote #${id}`, clientName: 'Sample Client', date: '2023-04-01', amount: 4200 };
    },
    create: async (quoteData) => {
      // Simulate API call
      console.log('Creating quote:', quoteData);
      return { id: Date.now().toString(), ...quoteData };
    },
    update: async (id, quoteData) => {
      // Simulate API call
      console.log('Updating quote:', id, quoteData);
      return { id, ...quoteData };
    },
    delete: async (id) => {
      // Simulate API call
      console.log('Deleting quote:', id);
      return { success: true };
    }
  },
  
  // Invoices API
  invoices: {
    getAll: async () => {
      // For now, just return mock data
      return [
        { id: '1', invoiceNumber: 'INV-001', clientName: 'John Doe', invoiceDate: '2023-01-20', amount: 5000, status: 'paid' },
        { id: '2', invoiceNumber: 'INV-002', clientName: 'Jane Smith', invoiceDate: '2023-02-25', amount: 3500, status: 'pending' },
        { id: '3', invoiceNumber: 'INV-003', clientName: 'Bob Johnson', invoiceDate: '2023-03-15', amount: 2800, status: 'paid' }
      ];
    },
    getById: async (id) => {
      // For now, just return mock data
      return { id, invoiceNumber: `INV-${id}`, clientName: 'Sample Client', invoiceDate: '2023-04-05', amount: 4200, status: 'pending' };
    },
    create: async (invoiceData) => {
      // Simulate API call
      console.log('Creating invoice:', invoiceData);
      return { id: Date.now().toString(), ...invoiceData };
    },
    update: async (id, invoiceData) => {
      // Simulate API call
      console.log('Updating invoice:', id, invoiceData);
      return { id, ...invoiceData };
    },
    delete: async (id) => {
      // Simulate API call
      console.log('Deleting invoice:', id);
      return { success: true };
    }
  },
  
  // Other API endpoints can be added here
};

export default api;