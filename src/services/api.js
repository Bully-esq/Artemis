import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.74:3000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token if it exists in localStorage
const token = localStorage.getItem('token');
if (token) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

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
    
    // Handle unauthorized (401) errors by dispatching an event that can be caught by the auth context
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-failed'));
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

// Catalog API - refactored for simplicity and reliability
const catalog = {
  getAll: async () => {
    try {
      // Fetch data from the server endpoint
      console.log('Fetching catalog items from server');
      const response = await apiClient.get('/catalog');
      const items = response.data;
      
      // If there's no data from server, return empty array
      if (!items || !Array.isArray(items)) {
        console.log('No catalog data received from server or invalid format, returning empty array');
        return [];
      }
      
      console.log(`Received ${items.length} catalog items from server`);
      
      // Return raw items - cleaning will happen in the component
      return items; 
    } catch (error) {
      console.error('Error fetching catalog from server:', error);
      // Optionally, you could try falling back to localStorage here if needed
      // For now, just return empty array on error
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      // Fetch specific item from server (assuming an endpoint exists, e.g., /api/catalog/:id)
      // If not, this might need to fetch all and filter, or rely on localStorage/cache
      // For now, keeping the localStorage logic as the server endpoint isn't shown for getById
      const rawData = localStorage.getItem('catalog'); // Keep localStorage for getById for now
      if (!rawData) return null;
      
      const items = JSON.parse(rawData);
      const item = items.find(item => item.id === id);
      
      // Clean the item name before returning
      return item ? {
        ...item,
        name: item.name ? String(item.name).replace(/0+$/, '') : ''
      } : null;
    } catch (error) {
      console.error(`Error in catalog.getById(${id}):`, error);
      return null;
    }
  },
  
  update: async (items) => {
    try {
      // Ensure items is an array
      if (!Array.isArray(items)) {
        console.error('Invalid catalog items format for update:', items);
        throw new Error('Items must be an array');
      }
      
      // Clean all item names before sending to server - KEEP this cleaning step here
      // as the component saving might not be the one displaying.
      const cleanedItems = items.map(item => ({
        ...item,
        name: item.name ? String(item.name).replace(/0+$/, '') : ''
      }));
      
      // Send update request to the server
      console.log(`Updating ${cleanedItems.length} catalog items on server`);
      const response = await apiClient.put('/catalog', { items: cleanedItems });
      
      // Optionally update localStorage as well for consistency or offline use
      // Consider cleaning items before saving to localStorage too if needed elsewhere
      localStorage.setItem('catalog', JSON.stringify(cleanedItems)); 
      console.log(`Updated catalog on server and in localStorage`);
      
      return response.data; // Return server response
    } catch (error) {
      console.error('Error updating catalog on server:', error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      if (!id) {
        throw new Error('No ID provided for deletion');
      }
      
      // Send delete request to the server
      console.log(`Deleting catalog item with ID: ${id} on server`);
      const response = await apiClient.delete(`/catalog/${id}`);
      
      // Optionally update localStorage after successful server deletion
      const rawData = localStorage.getItem('catalog');
      if (rawData) {
        const items = JSON.parse(rawData);
        const updatedItems = items.filter(item => item.id !== id);
        localStorage.setItem('catalog', JSON.stringify(updatedItems));
        console.log(`Deleted catalog item with ID: ${id} from localStorage`);
      }
      
      return response.data; // Return server response
    } catch (error) {
      console.error(`Error deleting catalog item on server (${id}):`, error);
      throw error;
    }
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

// Activities API - for tracking interactions with contacts
export const activitiesApi = {
  getByContactId: async (contactId) => {
    try {
      const response = await apiClient.get(`/activities/contact/${contactId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching activities for contact ${contactId}:`, error);
      
      // For demo purposes, return mock data if server fails
      console.log('Returning mock activities data for development');
      return mockActivities.filter(activity => activity.contactId === contactId);
    }
  },
  
  create: async (activity) => {
    try {
      const newActivity = {
        id: Date.now().toString(),
        timestamp: activity.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...activity
      };
      
      const response = await apiClient.post('/activities', { activity: newActivity });
      return response.data;
    } catch (error) {
      console.error('Error creating activity:', error);
      
      // For demo/development, add to mock data and return
      console.log('Adding to mock activities for development');
      const newActivity = {
        id: Date.now().toString(),
        timestamp: activity.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...activity
      };
      mockActivities.unshift(newActivity);
      return newActivity;
    }
  },
  
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/activities/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting activity ${id}:`, error);
      
      // For demo/development, remove from mock data
      console.log('Removing from mock activities for development');
      mockActivities = mockActivities.filter(a => a.id !== id);
      return { success: true };
    }
  }
};

// Mock activities data for development
const mockActivities = [
  {
    id: '1',
    contactId: '1',
    type: 'note',
    title: 'Initial contact',
    description: 'First conversation about potential project needs',
    timestamp: '2025-03-25T10:30:00Z',
    createdAt: '2025-03-25T10:30:00Z'
  },
  {
    id: '2',
    contactId: '1',
    type: 'email',
    title: 'Follow-up email',
    description: 'Sent project proposal and pricing information',
    timestamp: '2025-03-27T14:45:00Z',
    createdAt: '2025-03-27T14:45:00Z'
  },
  {
    id: '3',
    contactId: '1',
    type: 'meeting',
    title: 'Project kickoff meeting',
    description: 'Discussed project timeline and deliverables',
    timestamp: '2025-03-29T09:00:00Z',
    createdAt: '2025-03-29T09:00:00Z'
  }
];

// Export default API objects
export default {
  quotes: quotesApi,
  invoices: invoicesApi,
  contacts: contactsApi,
  suppliers: suppliersApi,
  catalog,
  settings: settingsApi,
  activities: activitiesApi,
  ping,
  client: apiClient  // Also export apiClient via the default export
};