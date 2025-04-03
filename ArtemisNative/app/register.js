import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { styled } from 'nativewind';

// Import shared UI components
import { FormField, Button } from '../src/components/ui';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

const Register = () => {
  const router = useRouter();
  const { register, error, clearError, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async () => {
    console.log('Registration form submitted');
    
    // Clear any previous auth errors
    if (error) clearError?.();
    
    // Validate form
    if (!validateForm()) {
      console.log('Form validation failed', formErrors);
      return;
    }
    
    console.log('Attempting registration with:', {
      name: formData.name,
      email: formData.email,
      password: '********'
    });
    
    try {
      // Attempt registration
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password
      };
      
      await register?.(userData);
      console.log('Registration successful');
      
      // Redirect to home screen
      router.replace('/');
    } catch (err) {
      // Auth errors are handled by the context
      console.error('Registration failed in component:', err.message);
    }
  };
  
  return (
    <StyledScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <StyledView className="flex-1 bg-gray-50 p-6">
        <StyledView className="w-full max-w-md mx-auto">
          <StyledView className="mb-8">
            <StyledText className="text-center text-3xl font-bold text-gray-900 mb-2">
              Create an Account
            </StyledText>
            <StyledText className="text-center text-gray-600">
              Already have an account?{' '}
              <Link href="/login" asChild>
                <StyledText className="text-blue-600 font-medium">Sign in</StyledText>
              </Link>
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
            
            {/* Registration Form */}
            <StyledView className="space-y-4">
              <FormField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={formErrors.name}
                required
                autoCapitalize="words"
              />
              
              <FormField
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
              
              <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={formErrors.confirmPassword}
                required
                autoComplete="password"
              />
              
              <StyledView className="mt-2">
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  disabled={loading}
                  onPress={handleSubmit}
                >
                  Register
                </Button>
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
};

export default Register; 