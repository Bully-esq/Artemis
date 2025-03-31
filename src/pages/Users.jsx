import React, { useState } from 'react';
import { useQuery } from 'react-query';
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { query } = useApi();
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Fetch users data
  const { data: users, isLoading, error } = query(
    ['users'], 
    () => {
      return api.client.get('/users').then(response => response.data);
    },
    {
      enabled: currentUser?.role === 'admin',
      refetchOnWindowFocus: true
    }
  );
  
  if (currentUser?.role !== 'admin') {
    return (
      <PageLayout title="Users">
        <div className="text-center p-8">
          <h2 className="text-lg font-medium">Access Denied</h2>
          <p className="mt-2 text-gray-500">You don't have permission to access this page.</p>
        </div>
      </PageLayout>
    );
  }
  
  if (isLoading) {
    return (
      <PageLayout title="Users">
        <div className="p-4">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="animate-pulse h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </PageLayout>
    );
  }
  
  if (error) {
    return (
      <PageLayout title="Users">
        <div className="p-4 text-red-600">
          Error loading users: {error.message}
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title="Users" 
      actions={
        <Button variant="primary" onClick={() => setSelectedUser({})}>
          Add User
        </Button>
      }
    >
      <div className="p-4">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users && users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* You would add a modal here for adding/editing users */}
    </PageLayout>
  );
};

export default Users; 