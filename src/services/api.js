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

// Quotes API
export const quotesApi = {
  getAll: async () => {
    const response = await apiClient.get('/quotes');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },
  
  save: async (quote) => {
    const response = await apiClient.post('/quotes', { quote });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/quotes/${id}`);
    return response.data;
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