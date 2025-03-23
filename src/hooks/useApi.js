import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Custom hook for making API requests with React Query integration
 * Handles loading states, errors, and retries automatically
 */
export function useApi() {
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  const { logout } = useAuth();

  /**
   * Handle API errors centrally
   * @param {Error} error - The error object from the API call
   * @param {Object} options - Error handling options
   */
  const handleError = (error, options = {}) => {
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

  /**
   * Make a GET request with React Query
   * @param {string} key - Query key for caching
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional options for React Query
   */
  const get = (key, endpoint, options = {}) => {
    const {
      enabled = true,
      refetchOnWindowFocus = false,
      onSuccess,
      onError,
      showErrorNotification = true,
      ...queryOptions
    } = options;
    
    return useQuery(
      key, 
      async () => {
        try {
          const response = await api.get(endpoint);
          return response.data;
        } catch (error) {
          handleError(error, { showNotification: showErrorNotification });
          throw error;
        }
      },
      {
        enabled,
        refetchOnWindowFocus,
        onSuccess,
        onError: (error) => {
          if (onError) onError(error);
        },
        ...queryOptions
      }
    );
  };

  /**
   * Make a custom query with React Query
   * @param {string|Array} key - Query key for caching
   * @param {Function} queryFn - Query function that returns a promise
   * @param {Object} options - Additional options for React Query
   */
  const query = (key, queryFn, options = {}) => {
    const {
      enabled = true,
      refetchOnWindowFocus = false,
      onSuccess,
      onError,
      showErrorNotification = true,
      ...queryOptions
    } = options;
    
    return useQuery(
      key, 
      async () => {
        try {
          return await queryFn();
        } catch (error) {
          handleError(error, { showNotification: showErrorNotification });
          throw error;
        }
      },
      {
        enabled,
        refetchOnWindowFocus,
        onSuccess,
        onError: (error) => {
          if (onError) onError(error);
        },
        ...queryOptions
      }
    );
  };

  /**
   * Create a mutation with React Query (for POST, PUT, DELETE, etc.)
   * @param {Function} mutationFn - Function that performs the mutation
   * @param {Object} options - Additional options for useMutation
   */
  const mutation = (mutationFn, options = {}) => {
    const {
      onSuccess,
      onError,
      showSuccessNotification = false,
      successMessage = 'Operation completed successfully',
      showErrorNotification = true,
      invalidateQueries = [],
      ...mutationOptions
    } = options;
    
    return useMutation(
      async (variables) => {
        try {
          return await mutationFn(variables);
        } catch (error) {
          handleError(error, { showNotification: showErrorNotification });
          throw error;
        }
      },
      {
        onSuccess: (data, variables, context) => {
          // Show success notification if requested
          if (showSuccessNotification) {
            addNotification(successMessage, 'success');
          }
          
          // Invalidate queries to refetch data
          if (invalidateQueries.length > 0) {
            invalidateQueries.forEach(query => {
              queryClient.invalidateQueries(query);
            });
          }
          
          // Call custom success handler if provided
          if (onSuccess) {
            onSuccess(data, variables, context);
          }
        },
        onError: (error, variables, context) => {
          // Call custom error handler if provided
          if (onError) {
            onError(error, variables, context);
          }
        },
        ...mutationOptions
      }
    );
  };

  /**
   * POST request mutation
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Mutation options
   */
  const post = (endpoint, options = {}) => {
    return mutation(
      (data) => api.post(endpoint, data),
      options
    );
  };

  /**
   * PUT request mutation
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Mutation options
   */
  const put = (endpoint, options = {}) => {
    return mutation(
      (data) => api.put(endpoint, data),
      options
    );
  };

  /**
   * DELETE request mutation
   * @param {string} endpoint - API endpoint or function to generate endpoint
   * @param {Object} options - Mutation options
   */
  const remove = (endpoint, options = {}) => {
    return mutation(
      (id) => {
        const url = typeof endpoint === 'function' ? endpoint(id) : `${endpoint}/${id}`;
        return api.delete(url);
      },
      options
    );
  };

  /**
   * Invalidate and refetch queries
   * @param {string|Array} queryKey - The query key to invalidate
   */
  const invalidate = (queryKey) => {
    return queryClient.invalidateQueries(queryKey);
  };

  /**
   * Get cached data for a query
   * @param {string|Array} queryKey - The query key to get data for
   */
  const getCachedData = (queryKey) => {
    return queryClient.getQueryData(queryKey);
  };

  /**
   * Set data in the query cache
   * @param {string|Array} queryKey - The query key to set data for
   * @param {*} data - The data to cache
   */
  const setCachedData = (queryKey, data) => {
    return queryClient.setQueryData(queryKey, data);
  };

  // Return all API methods
  return {
    get,
    query,
    mutation,
    post,
    put,
    remove,
    invalidate,
    getCachedData,
    setCachedData,
    handleError
  };
}

export default useApi;