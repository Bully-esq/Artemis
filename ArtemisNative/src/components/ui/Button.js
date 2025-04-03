import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * Button component for React Native
 * Styled with NativeWind (Tailwind for React Native)
 */
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
    <StyledTouchableOpacity
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
    </StyledTouchableOpacity>
  );
};

export default Button; 