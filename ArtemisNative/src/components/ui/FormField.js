import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { styled } from 'nativewind';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);

/**
 * FormField component for React Native forms
 * Styled with NativeWind (Tailwind for React Native)
 */
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

export default FormField; 