import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Initial state
const initialState = {
  settings: {
    company: {
      name: 'Axton\'s Staircases',
      contactName: 'Steve Atterbury',
      email: 'steve@axtons-staircases.co.uk',
      phone: '07889476954',
      website: 'axtons-staircases.co.uk',
      address: '29 Park Avenue, Northfleet\nKent, DA11 8DW',
      logo: null
    },
    quote: {
      defaultMarkup: 20,
      prefix: 'Q-',
      validityPeriod: 30,
      defaultTerms: '1'
    },
    invoice: {
      prefix: 'INV-',
      defaultPaymentTerms: '14',
      notesTemplate: '',
      footer: 'Thank you for your business.'
    },
    cis: {
      utr: '',
      niNumber: '',
      companyName: 'Axton\'s Staircases'
    }
  },
  currentQuoteId: null,
  currentInvoiceId: null,
  currentContactId: null,
  notifications: []
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_CURRENT_QUOTE':
      return { ...state, currentQuoteId: action.payload };
    case 'SET_CURRENT_INVOICE':
      return { ...state, currentInvoiceId: action.payload };
    case 'SET_CURRENT_CONTACT':
      return { ...state, currentContactId: action.payload };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, {
          id: Date.now(),
          ...action.payload
        }]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Context provider
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const networkStatus = useNetworkStatus();
  
  // Add a notification
  const addNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: { id, message, type, duration } 
    });
    
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, duration);
    }
    
    return id;
  };
  
  // Show network status changes
  useEffect(() => {
    if (networkStatus.online) {
      addNotification('Network connected', 'success', 3000);
    } else {
      addNotification('Network disconnected - Changes will not be saved', 'error', 0);
    }
  }, [networkStatus.online]);
  
  const value = {
    ...state,
    networkStatus,
    dispatch,
    addNotification,
    removeNotification: (id) => dispatch({ 
      type: 'REMOVE_NOTIFICATION', 
      payload: id 
    }),
    setCurrentQuote: (id) => dispatch({
      type: 'SET_CURRENT_QUOTE',
      payload: id
    }),
    setCurrentInvoice: (id) => dispatch({
      type: 'SET_CURRENT_INVOICE',
      payload: id
    }),
    setCurrentContact: (id) => dispatch({
      type: 'SET_CURRENT_CONTACT',
      payload: id
    }),
    updateSettings: (settings) => dispatch({
      type: 'SET_SETTINGS',
      payload: settings
    })
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the AppContext
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}