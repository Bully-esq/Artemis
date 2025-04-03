import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <PageLayout title="Page Not Found">
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary">Go to Dashboard</Button>
        </Link>
      </div>
    </PageLayout>
  );
};

export default NotFound;