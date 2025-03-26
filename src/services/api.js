import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.74:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a local storage wrapper for offline storage
const db = {
  getItem: async (key) => {
    try {
      const data = localStorage.getItem(key);
      console.log(`Retrieved from localStorage: ${key}`, data ? 'data found' : 'no data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting item from localStorage: ${key}`, error);
      return null;
    }
  },
  
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`Saved to localStorage: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error setting item in localStorage: ${key}`, error);
      throw new Error(`Storage error: ${error.message}`);
    }
  },
  
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
      console.log(`Removed from localStorage: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error removing item from localStorage: ${key}`);
      return false;
    }
  }
};

// Add interceptors for handling network status
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Check if error is a network error
    if (!error.response && error.message === 'Network Error') {
      // Dispatch network status event
      window.dispatchEvent(new CustomEvent('network-disconnected'));
    }
    return Promise.reject(error);
  }
);

// Add this debugging function to help diagnose save issues
const logApiOperation = (operation, data, result) => {
  console.log(`API ${operation}:`, { request: data, response: result });
  return result;
};

// Enhance quotes API with better debugging - fix to use server endpoints properly
const quotesApi = {
  getAll: async () => {
    try {
      console.log('Fetching all quotes from server');
      const result = await apiClient.get('/quotes');
      return logApiOperation('getAll quotes', null, result.data);
    } catch (error) {
      console.error('API Error - getAll quotes:', error);
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      console.log('Getting quote by ID:', id);
      const result = await apiClient.get(`/quotes/${id}`);
      
      console.log('Raw quote data from server:', result.data);
      
      // Server returns flat fields (clientName, clientEmail, etc.)
      // Convert to client expected structure with nested client object
      const serverQuote = result.data;
      
      // Build the client-side expected structure
      const clientFormattedQuote = {
        ...serverQuote,
        // Create client object from flat fields
        client: {
          name: serverQuote.clientName || '',
          company: serverQuote.clientCompany || '',
          email: serverQuote.clientEmail || '',
          phone: serverQuote.clientPhone || '',
          address: serverQuote.clientAddress || ''
        }
        // Note: Server now parses JSON strings for us
      };
      
      console.log('Formatted for client:', clientFormattedQuote);
      return clientFormattedQuote;
    } catch (error) {
      console.error(`API Error - getById quote ${id}:`, error);
      throw error;
    }
  },
  
  save: async (quote) => {
    try {
      console.log('Saving quote to server:', quote.id);
      
      // Make sure we include clientName and clientCompany at the top level
      // for compatibility with the server and quotes list
      const quoteToSave = {
        ...quote,
        clientName: quote.client?.name || '',
        clientCompany: quote.client?.company || '',
        clientEmail: quote.client?.email || '',
        clientPhone: quote.client?.phone || '',
        clientAddress: quote.client?.address || ''
      };
      
      const response = await apiClient.post('/quotes', { quote: quoteToSave });
      console.log('Server response after saving quote:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('API Error in quotes.save:', error);
      throw new Error(`Failed to save quote: ${error.message}`);
    }
  },
  
  delete: async (id) => {
    try {
      if (!id) {
        console.error('API Error - delete quote: No ID provided');
        throw new Error('No quote ID provided for deletion');
      }
      
      console.log(`API: Deleting quote with ID: "${id}"`);
      
      // Log the full URL being called for debugging
      const deleteUrl = `${apiClient.defaults.baseURL}/quotes/${id}`;
      console.log(`Making DELETE request to: ${deleteUrl}`);
      
      // Make the DELETE request
      const response = await apiClient.delete(`/quotes/${id}`);
      
      // Log response for debugging
      console.log('Quote deletion response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`API Error - delete quote ${id}:`, error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Server responded with error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('No response received from server. Request details:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Add more details to the error before throwing
      const enhancedError = new Error(`Failed to delete quote: ${error.message}`);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }
};

// Invoices API
export const invoicesApi = {
  getAll: async () => {
    const response = await apiClient.get('/invoices');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },
  
  save: async (invoice) => {
    const response = await apiClient.post('/invoices', { invoice });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  }
};

// Contacts API
export const contactsApi = {
  getAll: async () => {
    const response = await apiClient.get('/contacts');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/contacts/${id}`);
    return response.data;
  },
  
  search: async (query) => {
    const response = await apiClient.get(`/contacts/search/${encodeURIComponent(query)}`);
    return response.data;
  },
  
  save: async (contact) => {
    const response = await apiClient.post('/contacts', { contact });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/contacts/${id}`);
    return response.data;
  }
};

// Suppliers API
export const suppliersApi = {
  getAll: async () => {
    const response = await apiClient.get('/suppliers');
    return response.data;
  },
  
  update: async (suppliers) => {
    const response = await apiClient.put('/suppliers', { suppliers });
    return response.data;
  }
};

// Catalog API
export const catalogApi = {
  getAll: async () => {
    const response = await apiClient.get('/catalog');
    return response.data;
  },
  
  update: async (items) => {
    const response = await apiClient.put('/catalog', { items });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/catalog/${id}`);
    return response.data;
  }
};

// Settings API
export const settingsApi = {
  get: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },
  
  save: async (settings) => {
    const response = await apiClient.post('/settings', { settings });
    return response.data;
  }
};

// Export a ping function for checking server connectivity
export const ping = async () => {
  try {
    const response = await apiClient.get('/ping');
    return response.data;
  } catch (error) {
    console.error('Server ping failed:', error);
    throw error;
  }
};

export default {
  quotes: quotesApi,
  invoices: invoicesApi,
  contacts: contactsApi,
  suppliers: suppliersApi,
  catalog: catalogApi,
  settings: settingsApi,
  ping
};