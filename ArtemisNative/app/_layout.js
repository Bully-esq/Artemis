import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native'; // Use React Native components

// Assuming context files are in ../src/context relative to app/_layout.js
import { AppProvider } from '../src/context/AppContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// Assuming common components are in ../src/components relative to app/_layout.js
// Import Notifications and NetworkStatus if they need to be globally accessible
// import { Notifications } from '../src/components/common/Notification';
// import NetworkStatus from '../src/components/common/NetworkStatus';

// Create a client for React Query (same as before)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // RN apps don't have window focus like web
      retry: 1,
      staleTime: 300000, // 5 minutes
    },
  },
});

// Component to handle Authentication Logic
function AuthGuard({ children }) {
  const { isAuthenticated, loading, circuitBroken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for authentication state to load
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)'; // Assuming public routes are in an (auth) group (e.g., app/(auth)/login.js)
    const isProtectedRoute = !inAuthGroup && segments.length > 0; // Simple check, adjust if needed

    // Handle circuit breaker first
    if (circuitBroken && segments[0] !== 'login') {
        // Optionally pass state, though query params are more common in RN nav
        router.replace('/login?circuitBroken=true');
        return;
    }

    // Redirect unauthenticated users trying to access protected routes
    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/login'); // Redirect to your login screen file (e.g., app/login.js or app/(auth)/login.js)
    }
    // Redirect authenticated users away from auth screens
    else if (isAuthenticated && inAuthGroup) {
      router.replace('/'); // Redirect to your main dashboard screen (e.g., app/index.js or app/(tabs)/index.js)
    }

  }, [isAuthenticated, loading, segments, router, circuitBroken]);

  // Show a loading indicator while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render the children (the actual router stack) if authenticated or on a public route
  return children;
}


// Main Root Layout Component
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          {/* Global components like Notifications can go here if needed */}
          {/* <Notifications /> */}
          {/* <NetworkStatus /> */}

          <AuthGuard>
            {/* Configure the Stack Navigator */}
            <Stack screenOptions={{ headerShown: false }}>
              {/* Define specific stack screens if needed, or let Expo Router handle file-based routes */}
              {/* Example: Define login screen explicitly if it's outside the main stack flow */}
              {/* <Stack.Screen name="login" /> */}
              {/* <Stack.Screen name="(tabs)" /> Main tab navigator */}
            </Stack>
          </AuthGuard>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
} 