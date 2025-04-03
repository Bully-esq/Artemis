import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Shared utilities for hooks

/**
 * Common error handler function creator - used by all hooks
 */
const createErrorHandler = (addNotification, logout) => {
  return (error, options = {}) => {
    const { silent = false, showNotification = true } = options;
    
    if (!silent) {
      console.error('API Error:', error);
    }
    
    // Check if the error is due to unauthorized access (401)
    if (error.response && error.response.status === 401) {
      // Log the user out if their token is invalid/expired
      logout();
      addNotification('Your session has expired. Please log in again.', 'error');
      return;
    }
    
    // Check if the error is a network error
    if (!error.response && error.message === 'Network Error') {
      // Dispatch event for network status tracking
      window.dispatchEvent(new CustomEvent('network-disconnected'));
      
      if (showNotification) {
        addNotification('Network connection lost. Changes will not be saved.', 'error', 0);
      }
      return;
    }
    
    // Show generic error notification for other errors
    if (showNotification) {
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
      addNotification(`Error: ${errorMessage}`, 'error');
    }
  };
};

/**
 * Hook for getting error handling functionality
 */
export function useErrorHandler() {
  const { addNotification } = useAppContext();
  const { logout } = useAuth();
  
  return createErrorHandler(addNotification, logout);
}

/**
 * Hook for making GET requests
 */
export function useApiGet(key, endpoint, options = {}) {
  const handleError = useErrorHandler();
  
  return useQuery(
    key,
    async () => {
      try {
        const response = await api.get(endpoint);
        return response.data;
      } catch (error) {
        handleError(error, { showNotification: options.showErrorNotification !== false });
        throw error;
      }
    },
    options
  );
}

/**
 * Hook for making custom queries
 */
export function useApiCustomQuery(key, queryFn, options = {}) {
  const handleError = useErrorHandler();
  
  return useQuery(
    key,
    async () => {
      try {
        return await queryFn();
      } catch (error) {
        handleError(error, { showNotification: options.showErrorNotification !== false });
        throw error;
      }
    },
    options
  );
}

/**
 * Hook for making mutations (POST, PUT, DELETE, etc.)
 */
export function useApiMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  const handleError = useErrorHandler();
  
  return useMutation(
    async (variables) => {
      try {
        const result = await mutationFn(variables);
        return result;
      } catch (error) {
        handleError(error, { showNotification: options.showErrorNotification !== false });
        throw error;
      }
    },
    {
      ...options,
      onSuccess: (data, variables, context) => {
        // Show success notification if requested
        if (options.showSuccessNotification) {
          addNotification(
            options.successMessage || 'Operation completed successfully',
            'success'
          );
        }
        
        // Invalidate queries to refetch data
        if (options.invalidateQueries && options.invalidateQueries.length > 0) {
          options.invalidateQueries.forEach(query => {
            queryClient.invalidateQueries(query);
          });
        }
        
        // Call original onSuccess if provided
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      }
    }
  );
}

/**
 * Hook for making POST requests
 */
export function useApiPost(endpoint, options = {}) {
  return useApiMutation(
    (data) => api.post(endpoint, data),
    options
  );
}

/**
 * Hook for making PUT requests
 */
export function useApiPut(endpoint, options = {}) {
  return useApiMutation(
    (data) => api.put(endpoint, data),
    options
  );
}

/**
 * Hook for making DELETE requests
 */
export function useApiDelete(endpoint, options = {}) {
  return useApiMutation(
    (id) => {
      const url = typeof endpoint === 'function' ? endpoint(id) : `${endpoint}/${id}`;
      return api.delete(url);
    },
    options
  );
}

/**
 * Hook for query client utilities
 */
export function useQueryUtils() {
  const queryClient = useQueryClient();
  
  return {
    invalidateQueries: (queryKey) => queryClient.invalidateQueries(queryKey),
    getQueryData: (queryKey) => queryClient.getQueryData(queryKey),
    setQueryData: (queryKey, data) => queryClient.setQueryData(queryKey, data)
  };
}

// Legacy API compatibility layer
export function useApi() {
  console.warn(
    'useApi() is deprecated. Please use the individual hooks directly: ' +
    'useApiGet, useApiPost, useApiPut, useApiDelete, etc.'
  );
  
  // Access to query client utilities
  const utils = useQueryUtils();
  
  // For backwards compatibility, we create references to the hook results
  // but don't call hooks inside functions as that violates React hooks rules
  
  return {
    get: (key, endpoint, options) => {
      console.warn('api.get() is deprecated. Use useApiGet() directly in your component instead.');
      // Return an object that mimics the useApiGet interface instead of calling it
      return {
        refetch: () => console.warn('Cannot refetch from this context. Use useApiGet() directly in your component.'),
        data: null,
        isLoading: false,
        error: new Error('This method is deprecated. Use useApiGet() directly in your component.'),
      };
    },
    query: (key, queryFn, options) => {
      console.warn('api.query() is deprecated. Use useApiCustomQuery() directly in your component instead.');
      // Return an object that mimics the useApiCustomQuery interface
      return {
        refetch: () => console.warn('Cannot refetch from this context. Use useApiCustomQuery() directly in your component.'),
        data: null,
        isLoading: false,
        error: new Error('This method is deprecated. Use useApiCustomQuery() directly in your component.'),
      };
    },
    post: (endpoint, options) => {
      console.warn('api.post() is deprecated. Use useApiPost() directly in your component instead.');
      // Return an object that mimics the useMutation interface
      return {
        mutate: () => console.warn('Cannot mutate from this context. Use useApiPost() directly in your component.'),
        isLoading: false,
        error: new Error('This method is deprecated. Use useApiPost() directly in your component.'),
      };
    },
    put: (endpoint, options) => {
      console.warn('api.put() is deprecated. Use useApiPut() directly in your component instead.');
      // Return an object that mimics the useMutation interface
      return {
        mutate: () => console.warn('Cannot mutate from this context. Use useApiPut() directly in your component.'),
        isLoading: false,
        error: new Error('This method is deprecated. Use useApiPut() directly in your component.'),
      };
    },
    remove: (endpoint, options) => {
      console.warn('api.remove() is deprecated. Use useApiDelete() directly in your component instead.');
      // Return an object that mimics the useMutation interface
      return {
        mutate: () => console.warn('Cannot mutate from this context. Use useApiDelete() directly in your component.'),
        isLoading: false,
        error: new Error('This method is deprecated. Use useApiDelete() directly in your component.'),
      };
    },
    
    // Query client utilities
    ...utils
  };
}

export default useApi;