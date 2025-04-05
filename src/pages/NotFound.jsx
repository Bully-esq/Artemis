import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

const NotFound = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  
  // Re-apply authentication token on mount to prevent issues
  useEffect(() => {
    // If we have a token but it's not applied to axios, re-apply it
    if (token) {
      console.log('404 page: Re-applying token to API headers');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);
  
  const handleGoToDashboard = () => {
    // Additional safeguard - ensure token is applied before redirect
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Navigate directly to dashboard with replace to prevent history entries
    console.log('Navigating from 404 page to dashboard, token exists:', !!token);
    navigate('/dashboard', { replace: true });
  };
  
  return (
    <PageLayout title="Page Not Found">
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button 
          variant="primary"
          onClick={handleGoToDashboard}
        >
          Go to Dashboard
        </Button>
      </div>
    </PageLayout>
  );
};

export default NotFound;