import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.74:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

// Enhance quotes API with better debugging
const quotesApi = {
  getAll: async () => {
    try {
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
      const serverQuote = result.data.quote || result.data;
      
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
        },
        // Ensure these are arrays (server should parse JSON strings)
        selectedItems: Array.isArray(serverQuote.selectedItems) ? serverQuote.selectedItems : [],
        hiddenCosts: Array.isArray(serverQuote.hiddenCosts) ? serverQuote.hiddenCosts : [],
        exclusions: Array.isArray(serverQuote.exclusions) ? serverQuote.exclusions : []
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
      console.log('Attempting to save quote:', quote);
      
      // Convert client object to flat fields for server compatibility
      const serverQuote = {
        ...quote,
        id: quote.id || Date.now().toString(),
        // Map client object to individual fields that server expects
        clientName: quote.client?.name || '',
        clientCompany: quote.client?.company || '',
        clientEmail: quote.client?.email || '',
        clientPhone: quote.client?.phone || '',
        clientAddress: quote.client?.address || '',
        // Serialize arrays to JSON strings if needed
        selectedItems: Array.isArray(quote.selectedItems) ? quote.selectedItems : [],
        hiddenCosts: Array.isArray(quote.hiddenCosts) ? quote.hiddenCosts : [],
        exclusions: Array.isArray(quote.exclusions) ? quote.exclusions : []
      };
      
      console.log('Formatted for server:', serverQuote);
      
      // Send to server
      const response = await apiClient.post('/quotes', { quote: serverQuote });
      console.log('Quote save successful, response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API Error - save quote:', error);
      // Log more details about the error
      if (error.response) {
        console.error('Server response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
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