import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import { useApiCustomQuery } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api, { apiClient } from '../services/api';
import ActionButtonContainer from '../components/common/ActionButtonContainer';
import { useNotification } from '../hooks/useNotification';

// Import the necessary styles
import '../styles/components/lists.css';
import '../styles/components/tables.css';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  // Fetch users data using the direct hook
  const { data: users, isLoading, error } = useApiCustomQuery(
    ['users'], 
    () => {
      return apiClient.get('/users').then(response => response.data);
    },
    {
      enabled: currentUser?.role === 'admin',
      refetchOnWindowFocus: true
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => apiClient.delete(`/users/${userId}`),
    {
      onSuccess: () => {
        // Invalidate and refetch users query
        queryClient.invalidateQueries('users');
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'User has been successfully deleted'
        });
      },
      onError: (error) => {
        console.error('Error deleting user:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: error?.response?.data?.message || 'Failed to delete user. Please try again.'
        });
      }
    }
  );

  // Handle user deletion
  const handleDeleteUser = async (user) => {
    if (!user || !user.id) return;
    
    // Prevent deleting the current user
    if (user.id === currentUser.id) {
      showNotification({
        type: 'warning',
        title: 'Warning',
        message: 'You cannot delete your own account.'
      });
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);
    } catch (error) {
      // Error is handled in the mutation's onError
    }
  };
  
  if (currentUser?.role !== 'admin') {
    return (
      <PageLayout title="Users">
        <div className="card max-w-md mx-auto mt-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full status-badge-danger mb-4">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 list-item-title">Access Denied</h2>
            <p className="list-item-subtitle">You don't have permission to access this page.</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  if (isLoading) {
    return (
      <PageLayout title="Users">
        <div className="p-4">
          <div className="card w-full">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-skeleton rounded w-1/4"></div>
              <div className="h-4 bg-skeleton rounded w-full"></div>
              <div className="h-4 bg-skeleton rounded w-5/6"></div>
              <div className="h-64 bg-skeleton rounded w-full"></div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  if (error) {
    return (
      <PageLayout title="Users">
        <div className="p-4">
          <div className="card">
            <div className="flex items-center status-badge-danger mb-4">
              <svg className="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium">Error Loading Users</h3>
            </div>
            <p className="list-item-subtitle">{error.message}</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Users">
      {/* Add ActionButtonContainer matching the QuoteBuilder style */}
      <ActionButtonContainer>
        <Button
          variant="primary"
          onClick={() => setSelectedUser({})}
        >
          <span className="button-content">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add User
          </span>
        </Button>
      </ActionButtonContainer>
      
      <div className="p-4">
        <div className="card">
          <div className="card-body">
            <div className="px-4 py-5 border-b border-color-light sm:px-6">
              <h3 className="text-lg leading-6 font-medium card-title">
                User Management
              </h3>
              <p className="mt-1 text-sm list-item-subtitle">
                View and manage user accounts and permissions
              </p>
            </div>
            
            <div className="responsive-table-wrapper w-full">
              <div className="overflow-x-auto">
                <table className="table spaced-table w-full">
                  <thead>
                    <tr>
                      <th scope="col" className="w-1/5">Name</th>
                      <th scope="col" className="w-1/5">Email</th>
                      <th scope="col" className="w-1/10">Role</th>
                      <th scope="col" className="w-1/7">Created</th>
                      <th scope="col" className="w-1/7">Last Login</th>
                      <th scope="col" className="w-1/5 action-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="cell-content truncate max-w-full">{user.name}</div>
                          </td>
                          <td>
                            <div className="cell-content truncate max-w-full">{user.email}</div>
                          </td>
                          <td>
                            <div className="status-button-container">
                              <span className={`status-badge ${user.role === 'admin' ? 'status-badge-info' : 'status-badge-success'}`}>
                                {user.role}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="cell-content whitespace-nowrap">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <div className="cell-content whitespace-nowrap">
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                            </div>
                          </td>
                          <td className="action-cell">
                            <div className="action-row">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="btn btn-list-item btn-list-item--secondary"
                              >
                                <span className="button-content">
                                  <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                  Edit
                                </span>
                              </button>
                              <button
                                className="btn btn-list-item btn-list-item--danger"
                                disabled={deleteUserMutation.isLoading || user.id === currentUser.id}
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
                                    handleDeleteUser(user);
                                  }
                                }}
                              >
                                <span className="button-content">
                                  {deleteUserMutation.isLoading && deleteUserMutation.variables === user.id ? (
                                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  Delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 empty-state-description">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {users && users.length > 0 && (
              <div className="px-4 py-3 table-footer border-t border-color-light sm:px-6">
                <div className="text-sm list-item-subtitle">
                  Showing <span className="font-medium list-item-title">{users.length}</span> users
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* You would add a modal here for adding/editing users */}
    </PageLayout>
  );
};

export default Users;