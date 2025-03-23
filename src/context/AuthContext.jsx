import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null
};

// Create auth reducer
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        loading: false,
        error: null
      };
    case 'LOGIN_FAIL':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: true
      };
    default:
      return state;
  }
}

// Create the auth context
const AuthContext = createContext();

// Token storage helpers
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is logged in on first load
  useEffect(() => {
    const loadUser = async () => {
      // Check for token in storage
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: 'AUTH_ERROR' });
        return;
      }
      
      try {
        // Set token in axios headers
        setToken(token);
        
        // Fetch current user data
        // This is a placeholder for your actual user endpoint
        // const res = await api.get('/auth/user');
        // dispatch({ type: 'USER_LOADED', payload: res.data });
        
        // For demonstration, we'll simulate a successful load
        // Replace this with actual API call in production
        setTimeout(() => {
          dispatch({ 
            type: 'USER_LOADED', 
            payload: { 
              id: '1',
              name: 'Steve Atterbury',
              email: 'steve@axtons-staircases.co.uk',
              role: 'admin'
            } 
          });
        }, 500);
      } catch (err) {
        // Clear the invalid token
        setToken(null);
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: err.response?.data?.message || 'Authentication failed' 
        });
      }
    };

    loadUser();
  }, []);

  // Login user
  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      // This is a placeholder for your actual login endpoint
      // const res = await api.post('/auth/login', { email, password });
      // const { token, user } = res.data;
      
      // For demonstration, we'll simulate a successful login
      // Replace this with actual API call in production
      return new Promise((resolve) => {
        setTimeout(() => {
          // Sample token (in production, this would come from your server)
          const token = 'sample-jwt-token.signed.payload';
          const user = { 
            id: '1',
            name: 'Steve Atterbury',
            email: 'steve@axtons-staircases.co.uk',
            role: 'admin'
          };
          
          // Set token in local storage and axios headers
          setToken(token);
          
          // Update state
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
          resolve();
        }, 1000);
      });
    } catch (err) {
      dispatch({ 
        type: 'LOGIN_FAIL', 
        payload: err.response?.data?.message || 'Invalid credentials' 
      });
      throw err;
    }
  };

  // Logout user
  const logout = () => {
    setToken(null);
    dispatch({ type: 'LOGOUT' });
  };

  // Clear any errors
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loading: state.loading,
        error: state.error,
        login,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth required component for protected routes
export const AuthRequired = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : null;
};

export default AuthContext;