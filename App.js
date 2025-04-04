import React, { useEffect } from 'react';
import { SafeAreaView, Text, View, StatusBar } from 'react-native';
import { styled } from 'nativewind';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Button, FormField } from './src/components/ui';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledSafeAreaView = styled(SafeAreaView);

// Simple home screen
const HomeScreen = () => {
  const { user, logout } = useAuth();
  
  return (
    <StyledView className="flex-1 p-4">
      <StyledText className="text-2xl font-bold mb-4">Welcome to Artemis</StyledText>
      <StyledText className="mb-2">You are logged in as {user?.name || 'Guest'}</StyledText>
      <Button onPress={logout}>Logout</Button>
    </StyledView>
  );
};

// Login form
const LoginScreen = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { login, error } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  return (
    <StyledView className="flex-1 p-4">
      <StyledText className="text-2xl font-bold mb-6">Login</StyledText>
      
      <FormField
        label="Email"
        name="email"
        value={email}
        onChange={({ target }) => setEmail(target.value)}
        placeholder="Enter your email"
        autoComplete="email"
      />
      
      <FormField
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={({ target }) => setPassword(target.value)}
        placeholder="Enter your password"
        secureTextEntry
      />
      
      {error && (
        <StyledText className="text-red-500 mb-4">{error}</StyledText>
      )}
      
      <Button onPress={handleLogin} className="mt-2">Login</Button>
    </StyledView>
  );
};

// Main app component
const App = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Main />
      </AppProvider>
    </AuthProvider>
  );
};

// Main component with auth state
const Main = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 justify-center items-center bg-white">
        <StyledText>Loading...</StyledText>
      </StyledSafeAreaView>
    );
  }
  
  return (
    <StyledSafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />
      {isAuthenticated ? <HomeScreen /> : <LoginScreen />}
    </StyledSafeAreaView>
  );
};

export default App; 