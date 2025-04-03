// This is the Login Screen - app/login.js
// TODO: Copy logic from src/pages/Login.js and refactor for React Native

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Switch, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

// Import shared UI components
import { FormField, Button } from '../src/components/ui';

// Define available API endpoints
const API_ENDPOINTS = [
  { url: 'https://app.uncharted.social/api', name: 'Production Server' }
];

// Create styled components with NativeWind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledPressable = styled(Pressable);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// FormField component adapted for React Native
const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  secureTextEntry = false,
  autoCapitalize = 'none',
  autoComplete,
  ...rest
}) => {
  return (
    <StyledView className="mb-4">
      {label && (
        <StyledView className="flex-row mb-1">
          <StyledText className="font-medium text-gray-700">{label}</StyledText>
          {required && <StyledText className="text-red-500 ml-1">*</StyledText>}
        </StyledView>
      )}
      
      <StyledTextInput
        value={value}
        onChangeText={(text) => onChange({ target: { name, value: text } })}
        placeholder={placeholder}
        className={`bg-white border rounded-md p-3 ${error ? 'border-red-500' : 'border-gray-300'}`}
        secureTextEntry={secureTextEntry || type === 'password'}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        {...rest}
      />
      
      {error && (
        <StyledText className="mt-1 text-red-500 text-xs">{error}</StyledText>
      )}
    </StyledView>
  );
};

// Button component adapted for React Native
const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  fullWidth = false,
  onPress,
  className = '',
  children,
  disabled = false,
  ...rest
}) => {
  // Map variants to Tailwind classes
  const variantClasses = {
    primary: 'bg-blue-600 dark:bg-blue-700',
    secondary: 'bg-gray-200 dark:bg-gray-600',
    danger: 'bg-red-600 dark:bg-red-700',
    ghost: 'bg-transparent'
  };
  
  // Map text colors based on variant
  const textColorClasses = {
    primary: 'text-white',
    secondary: 'text-gray-700 dark:text-white',
    danger: 'text-white',
    ghost: 'text-blue-600 dark:text-blue-400'
  };
  
  // Determine size classes
  const sizeClasses = {
    sm: 'py-1.5 px-3',
    md: 'py-2 px-4',
    lg: 'py-3 px-6'
  };
  
  // Combine all classes
  const buttonClasses = `
    rounded-md ${variantClasses[variant] || variantClasses.primary} 
    ${sizeClasses[size] || sizeClasses.md}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || isLoading ? 'opacity-50' : ''}
    ${className}
  `;
  
  const textClasses = `
    font-medium text-center 
    ${textColorClasses[variant] || textColorClasses.primary}
  `;
  
  return (
    <StyledPressable
      onPress={onPress}
      disabled={disabled || isLoading}
      className={buttonClasses}
      {...rest}
    >
      <StyledView className="flex-row justify-center items-center">
        {isLoading && (
          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
        )}
        <StyledText className={textClasses}>{children}</StyledText>
      </StyledView>
    </StyledPressable>
  );
};

const Login = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const circuitBrokenFromParams = params.circuitBroken === 'true';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const apiChecked = useRef(false);
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState(
    // Use AsyncStorage here if needed, but for simplicity, we'll start with a default
    API_ENDPOINTS[0].url
  );
  const [showApiConfig, setShowApiConfig] = useState(false);
  
  // Add debug mode state
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const debugTapCount = useRef(0);
  const lastDebugTap = useRef(0);
  
  // Add authentication debug state
  const [authDebugInfo, setAuthDebugInfo] = useState({
    lastLoginAttempt: null,
    redirectTriggered: false,
    isAuthenticatedValue: false
  });

  const { 
    login, 
    isAuthenticated, 
    error, 
    clearError, 
    loading, 
    testConnection, 
    resetCircuitBreaker,
    circuitBroken,
    setLoginPageStatus
  } = useAuth();

  // Tell AuthContext we're on the login page when component mounts
  useEffect(() => {
    console.log('Setting login page status');
    setLoginPageStatus?.(true);
    
    return () => {
      console.log('Leaving login page, resetting login page status');
      setLoginPageStatus?.(false);
    };
  }, [setLoginPageStatus]);

  // Check for authentication status
  useEffect(() => {
    console.log('Login.js - Auth effect triggered:');
    console.log('- isAuthenticated:', isAuthenticated);
    
    setAuthDebugInfo(prev => ({
      ...prev,
      isAuthenticatedValue: isAuthenticated,
      redirectTriggered: isAuthenticated,
      lastCheck: new Date().toISOString()
    }));
    
    if (isAuthenticated) {
      console.log('Navigating to dashboard');
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      if (error) clearError?.();
    };
  }, [error, clearError]);

  // Load remembered email if exists (would use AsyncStorage in a real app)
  useEffect(() => {
    // const loadRememberedEmail = async () => {
    //   try {
    //     const rememberedEmail = await AsyncStorage.getItem('rememberedEmail');
    //     if (rememberedEmail) {
    //       setFormData(prev => ({ ...prev, email: rememberedEmail }));
    //       setRememberMe(true);
    //     }
    //   } catch (error) {
    //     console.error('Error loading remembered email:', error);
    //   }
    // };
    // 
    // loadRememberedEmail();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field-specific error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Handle API endpoint change
  const handleApiEndpointChange = (newEndpoint) => {
    setSelectedApiEndpoint(newEndpoint);
    // Would save to AsyncStorage in a real app
    // AsyncStorage.setItem('selectedApiEndpoint', newEndpoint);
    apiChecked.current = false;
    setApiStatus('checking');
    
    // Reset errors
    if (error) clearError?.();
  };

  // Test API connectivity manually
  const handleTestConnection = async () => {
    setApiStatus('checking');
    try {
      const connected = await testConnection?.(selectedApiEndpoint);
      setApiStatus(connected ? 'connected' : 'disconnected');
    } catch (err) {
      console.error('Manual API check failed:', err);
      setApiStatus('error');
    }
  };

  // Handle debug mode activation with multiple taps
  const handleTitleClick = () => {
    const now = Date.now();
    if (now - lastDebugTap.current < 500) {
      debugTapCount.current++;
      if (debugTapCount.current >= 5) {
        setShowDebugInfo(true);
        debugTapCount.current = 0;
      }
    } else {
      debugTapCount.current = 1;
    }
    lastDebugTap.current = now;
  };

  // Reset circuit breaker
  const handleResetCircuitBreaker = () => {
    if (resetCircuitBreaker) {
      resetCircuitBreaker();
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Clear any previous auth errors
    if (error) clearError?.();
    
    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed', formErrors);
      return;
    }
    
    console.log('Attempting login with:', formData);
    console.log('Target API URL:', selectedApiEndpoint);
    
    try {
      // Update debugging state
      setAuthDebugInfo(prev => ({
        ...prev,
        lastLoginAttempt: new Date().toISOString(),
        loginStarted: true
      }));
      
      // Attempt login with the selected endpoint
      await login?.(formData.email, formData.password, selectedApiEndpoint);
      console.log('Login successful');
      
      // Update debug info
      setAuthDebugInfo(prev => ({
        ...prev,
        loginSuccessful: true
      }));
      
      // Save email if "Remember me" is checked
      if (rememberMe) {
        // Would use AsyncStorage in a real app
        // AsyncStorage.setItem('rememberedEmail', formData.email);
      } else {
        // AsyncStorage.removeItem('rememberedEmail');
      }
    } catch (err) {
      // Auth errors are handled by the context
      console.error('Login failed in component:', err.message);
      
      // Update debug info
      setAuthDebugInfo(prev => ({
        ...prev,
        loginSuccessful: false,
        loginErrorMessage: err.message
      }));
    }
  };

  // Render API status icon
  const renderApiStatusIcon = () => {
    if (apiStatus === 'connected') {
      return <StyledView className="h-3 w-3 rounded-full bg-green-500 mr-2" />;
    } else if (apiStatus === 'disconnected' || apiStatus === 'error') {
      return <StyledView className="h-3 w-3 rounded-full bg-red-500 mr-2" />;
    } else if (apiStatus === 'checking') {
      return <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />;
    }
    return <StyledView className="h-3 w-3 rounded-full bg-gray-300 mr-2" />;
  };

  return (
    <StyledScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <StyledView className="flex-1 bg-gray-50 p-6">
        <StyledView className="w-full max-w-md mx-auto">
          <StyledView className="mb-8">
            <StyledText 
              className="text-center text-3xl font-bold text-gray-900 mb-2"
              onPress={handleTitleClick}
            >
              Welcome to Axton's Staircases
            </StyledText>
            <StyledText className="text-center text-gray-600">
              Log in to your account to continue
            </StyledText>
          </StyledView>
          
          {/* Card container */}
          <StyledView className="bg-white p-6 rounded-lg shadow-sm">
            {/* Show auth error if any */}
            {error && (
              <StyledView className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
                <StyledView className="flex-row">
                  <StyledText className="text-red-700">{error}</StyledText>
                </StyledView>
              </StyledView>
            )}
            
            {/* Circuit breaker warning */}
            {(circuitBroken || circuitBrokenFromParams) && (
              <StyledView className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <StyledView className="flex-row">
                  <StyledText className="text-yellow-700">
                    Authentication temporarily disabled due to too many failed attempts. 
                    Please try again later.
                  </StyledText>
                </StyledView>
                {showDebugInfo && (
                  <StyledTouchableOpacity 
                    onPress={handleResetCircuitBreaker}
                    className="mt-2"
                  >
                    <StyledText className="text-xs underline text-yellow-800">
                      Reset Circuit Breaker
                    </StyledText>
                  </StyledTouchableOpacity>
                )}
              </StyledView>
            )}
            
            {/* Login Form */}
            <StyledView className="space-y-4">
              <FormField
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                error={formErrors.email}
                required
                autoComplete="email"
                keyboardType="email-address"
              />
              
              <FormField
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                required
                autoComplete="password"
              />
              
              <StyledView className="flex-row justify-between items-center">
                <StyledView className="flex-row items-center">
                  <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={rememberMe ? '#3b82f6' : '#f4f4f5'}
                  />
                  <StyledText className="ml-2 text-gray-900">Remember me</StyledText>
                </StyledView>
                
                <StyledTouchableOpacity>
                  <StyledText className="text-blue-600">Forgot password?</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
              
              <StyledView className="mt-2">
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  disabled={circuitBroken || circuitBrokenFromParams}
                  onPress={handleSubmit}
                >
                  Sign in
                </Button>
              </StyledView>
            </StyledView>

            {/* Registration link */}
            <StyledView className="mt-6 items-center">
              <StyledText className="text-gray-600">
                Don't have an account?{' '}
                <Link href="/register" asChild>
                  <StyledText className="text-blue-600 font-medium">Register now</StyledText>
                </Link>
              </StyledText>
            </StyledView>

            {/* API Connection Status */}
            <StyledView className="mt-6 pt-4 border-t border-gray-200">
              <StyledView className="items-center">
                <StyledView className="flex-row items-center mb-2">
                  <StyledText className="mr-2 text-sm">API Connection:</StyledText>
                  <StyledView className="flex-row items-center">
                    {renderApiStatusIcon()}
                    <StyledText className={
                      apiStatus === 'connected' ? 'text-green-600' :
                      apiStatus === 'disconnected' || apiStatus === 'error' ? 'text-red-600' :
                      apiStatus === 'checking' ? 'text-yellow-600' :
                      'text-gray-600'
                    }>
                      {apiStatus === 'connected' ? 'Connected' :
                       apiStatus === 'disconnected' ? 'Disconnected' :
                       apiStatus === 'error' ? 'Connection Error' :
                       apiStatus === 'checking' ? 'Checking...' :
                       'Unknown'}
                    </StyledText>
                  </StyledView>
                </StyledView>
                
                <StyledTouchableOpacity 
                  onPress={() => setShowApiConfig(!showApiConfig)}
                  className="mb-2"
                >
                  <StyledText className="text-xs text-blue-600">
                    {showApiConfig ? 'Hide API Configuration' : 'Show API Configuration'}
                  </StyledText>
                </StyledTouchableOpacity>
                
                {showApiConfig && (
                  <StyledView className="w-full mb-2">
                    <StyledText className="text-xs font-medium text-gray-700 mb-1">
                      API Endpoint
                    </StyledText>
                    {API_ENDPOINTS.map((endpoint) => (
                      <StyledTouchableOpacity 
                        key={endpoint.url}
                        onPress={() => handleApiEndpointChange(endpoint.url)}
                        className={`p-2 border rounded-md mb-1 ${
                          selectedApiEndpoint === endpoint.url ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
                        }`}
                      >
                        <StyledText className="text-xs">
                          {endpoint.name} ({endpoint.url})
                        </StyledText>
                      </StyledTouchableOpacity>
                    ))}
                  </StyledView>
                )}
                
                <StyledTouchableOpacity 
                  onPress={handleTestConnection}
                  className="mb-2"
                >
                  <StyledText className="text-xs text-blue-600">
                    Test API connection
                  </StyledText>
                </StyledTouchableOpacity>
                
                {(apiStatus === 'disconnected' || apiStatus === 'error') && (
                  <StyledText className="text-xs text-gray-500 text-center">
                    {apiStatus === 'disconnected' && `Cannot connect to ${selectedApiEndpoint}. Try a different endpoint.`}
                    {apiStatus === 'error' && "Connection blocked. Check console for details."}
                  </StyledText>
                )}
              </StyledView>
            </StyledView>
            
            {/* Debug Information */}
            {showDebugInfo && (
              <StyledView className="mt-4 pt-4 border-t border-gray-200">
                <StyledText className="font-medium text-gray-700 mb-2">Debug Information</StyledText>
                <StyledView className="bg-gray-50 p-2 rounded">
                  <StyledText className="text-xs">API URL: {selectedApiEndpoint}</StyledText>
                  <StyledText className="text-xs">API Status: {apiStatus || 'unknown'}</StyledText>
                  <StyledText className="text-xs">Circuit Breaker: {circuitBroken ? 'ACTIVE' : 'inactive'}</StyledText>
                  <StyledText className="text-xs mt-2">Authentication Status:</StyledText>
                  <StyledText className="text-xs ml-2">
                    isAuthenticated: <StyledText className={isAuthenticated ? "text-green-600 font-bold" : "text-red-600"}>
                      {isAuthenticated ? "TRUE" : "false"}
                    </StyledText>
                  </StyledText>
                  <StyledText className="text-xs ml-2">
                    Last login attempt: {authDebugInfo.lastLoginAttempt || 'none'}
                  </StyledText>
                  <StyledText className="text-xs ml-2">
                    Login successful: <StyledText className={authDebugInfo.loginSuccessful ? "text-green-600 font-bold" : "text-red-600"}>
                      {authDebugInfo.loginSuccessful ? "TRUE" : "false"}
                    </StyledText>
                  </StyledText>
                  
                  <StyledView className="mt-2 flex-row flex-wrap">
                    <StyledTouchableOpacity 
                      className="bg-gray-200 py-1 px-2 rounded mr-2 mb-2"
                      onPress={() => setShowDebugInfo(false)}
                    >
                      <StyledText className="text-xs">Hide Debug Info</StyledText>
                    </StyledTouchableOpacity>
                    
                    <StyledTouchableOpacity 
                      className="bg-blue-200 py-1 px-2 rounded mr-2 mb-2"
                      onPress={() => router.replace('/')}
                    >
                      <StyledText className="text-xs">Force Navigate to Dashboard</StyledText>
                    </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>
              </StyledView>
            )}
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default Login; 