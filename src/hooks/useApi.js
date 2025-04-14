import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as storageService from '../services/storageService';

// Shared utilities for hooks

/**
 * Common error handler function creator - used by all hooks
 */
const createErrorHandler = (addNotification, logout) => {
  return (error, options = {}) => {
    const { silent = false, showNotification = true } = options;
    
    if (!silent) {
      console.error('Storage/Hook Error:', error);
    }
    
    // Check if the error is a network error
    if (!error.response && error.message === 'Network Error') {
      // Dispatch event for network status tracking
      window.dispatchEvent(new CustomEvent('network-disconnected'));
      
      if (showNotification) {
        addNotification('Network connection issue detected.', 'warning', 0);
      }
      return;
    }
    
    // Show generic error notification for other errors
    if (showNotification) {
      const errorMessage = error.message || 'An unexpected error occurred';
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
 * Hook for making GET requests (Read from IndexedDB)
 * Adapts based on the query key: 
 * - key = ['storeName'] fetches all items.
 * - key = ['storeName', itemId] fetches a single item.
 */
export function useApiGet(key, _endpoint_ignored = null, options = {}) {
  const handleError = useErrorHandler();
  
  if (!Array.isArray(key) || key.length === 0) {
    throw new Error('useApiGet requires a query key array, e.g., ["storeName"] or ["storeName", itemId]');
  }

  const storeName = key[0];
  const itemId = key.length > 1 ? key[1] : undefined;

  return useQuery(
    key,
    async () => {
      try {
        if (itemId !== undefined) {
          console.log(`[useApiGet] Fetching item: ${storeName}/${itemId}`);
          const item = await storageService.getItem(storeName, itemId);
          return item === null ? undefined : item; 
        } else {
          console.log(`[useApiGet] Fetching all items: ${storeName}`);
          return await storageService.getAllItems(storeName);
        }
      } catch (error) {
        handleError(error, { showNotification: options.showErrorNotification !== false });
        throw error;
      }
    },
    options
  );
}

/**
 * Hook for making custom queries (using storageService)
 * The provided queryFn should now use storageService methods.
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
 * Hook for making mutations (Write to IndexedDB: POST, PUT, DELETE)
 * The mutationFn should now use storageService methods.
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
        if (options.showSuccessNotification) {
          addNotification(
            options.successMessage || 'Data saved successfully',
            'success'
          );
        }
        
        if (options.invalidateQueries && options.invalidateQueries.length > 0) {
          console.log('[useApiMutation] Invalidating queries:', options.invalidateQueries);
          options.invalidateQueries.forEach(query => {
            queryClient.invalidateQueries(query);
          });
        }
        
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      }
    }
  );
}

/**
 * Hook for adding/updating data (POST/PUT -> IndexedDB putItem)
 * Requires storeName instead of endpoint.
 */
export function useApiSave(storeName, options = {}) {
  if (!storeName) {
    throw new Error('useApiSave requires a storeName.');
  }
  return useApiMutation(
    (data) => {
      console.log(`[useApiSave] Saving to store: ${storeName}`, data);
      if (!data || typeof data.id === 'undefined') {
         console.warn(`[useApiSave] Data being saved to ${storeName} is missing an 'id'. IndexedDB requires a key path.`, data);
      }
      return storageService.putItem(storeName, data);
    },
    {
      invalidateQueries: [[storeName]], 
      ...options,
    }
  );
}

/**
 * Hook for making DELETE requests (IndexedDB deleteItem)
 * Requires storeName instead of endpoint.
 */
export function useApiDelete(storeName, options = {}) {
  if (!storeName) {
    throw new Error('useApiDelete requires a storeName.');
  }
  return useApiMutation(
    (id) => {
      console.log(`[useApiDelete] Deleting from store: ${storeName}, ID: ${id}`);
      return storageService.deleteItem(storeName, id);
    },
    {
      invalidateQueries: [[storeName]], 
      ...options,
    }
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