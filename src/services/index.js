// Export services for easier imports
import api, { apiClient, setApiBaseUrl } from './api';
import authService from './auth';
import utils from './utils';

export {
  api,
  apiClient,
  setApiBaseUrl,
  authService,
  utils
};

// Default export for convenience
export default {
  api,
  auth: authService,
  utils
}; 