import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import PageLayout from '../components/common/PageLayout';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Dialog from '../components/common/Dialog';
import { useApiCustomQuery } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api, { apiClient } from '../services/api';
import ActionButtonContainer from '../components/common/ActionButtonContainer';
import { useAppContext } from '../context/AppContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { addNotification } = useAppContext();
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const queryClient = useQueryClient();
  
  const { data: users, isLoading, error } = useApiCustomQuery(
    ['users'],
    () => {
      return apiClient.get('/users').then(response => response.data);
    },
    {
      enabled: currentUser?.role === 'admin',
      refetchOnWindowFocus: true,
      onError: (err) => {
        addNotification(`Error loading users: ${err?.message || 'Unknown error'}`, 'error');
      }
    }
  );

  const deleteUserMutation = useMutation(
    (userId) => apiClient.delete(`/users/${userId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        addNotification('User deleted successfully', 'success');
        setShowDeleteDialog(false);
        setUserToDelete(null);
      },
      onError: (err) => {
        console.error('Error deleting user:', err);
        addNotification(`Error deleting user: ${err?.response?.data?.message || 'Please try again.'}`, 'error');
      }
    }
  );

  const handleDeleteUser = (user) => {
    if (!user || !user.id) return;

    if (user.id === currentUser.id) {
      addNotification('You cannot delete your own account.', 'warning');
      return;
    }
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleAddUser = () => {
    addNotification('Add/Edit User functionality not implemented yet.', 'info');
  };

  const handleEditUser = (user) => {
    addNotification('Add/Edit User functionality not implemented yet.', 'info');
  };

  if (currentUser?.role !== 'admin') {
    return (
      <PageLayout title="Users">
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm max-w-md mx-auto mt-10 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-bg-light text-danger-icon mb-4">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-text-primary">Access Denied</h2>
            <p className="text-sm text-text-secondary">You don't have permission to view this page.</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  if (isLoading) {
    return (
      <PageLayout title="Users">
        <ActionButtonContainer>
          <Button variant="primary" disabled>
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2 -ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add User
            </span>
          </Button>
        </ActionButtonContainer>
        <div className="bg-card-background border border-card-border rounded-lg shadow-sm p-4 md:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-skeleton rounded w-1/4"></div>
            <div className="h-4 bg-skeleton rounded w-1/2"></div>
            <div className="h-4 bg-skeleton rounded w-full"></div>
            <div className="h-4 bg-skeleton rounded w-5/6"></div>
            <div className="h-4 bg-skeleton rounded w-full"></div>
            <div className="h-4 bg-skeleton rounded w-3/4"></div>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  if (error) {
    return (
      <PageLayout title="Users">
        <ActionButtonContainer>
          <Button variant="primary" onClick={handleAddUser}>
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2 -ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add User
            </span>
          </Button>
        </ActionButtonContainer>
        <div className="bg-danger-bg-light border-l-4 border-danger-border p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-danger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-10a1 1 0 10-2 0v4a1 1 0 102 0V8zm-1 7a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-danger-text-dark">Error Loading Users</h3>
              <p className="mt-1 text-sm text-danger-text">{error.message || 'Could not fetch user data.'}</p>
              <div className="mt-4">
                <Button
                  variant="danger_outline"
                  size="sm"
                  onClick={() => queryClient.refetchQueries('users')}
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Users">
      <ActionButtonContainer>
        <Button
          variant="primary"
          onClick={handleAddUser}
        >
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2 -ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add User
          </span>
        </Button>
      </ActionButtonContainer>
      
      <div className="bg-card-background border border-card-border rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="px-4 py-4 sm:px-6 border-b border-border-color">
          <h3 className="text-lg leading-6 font-medium text-text-primary">
            User Management
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            View and manage user accounts and permissions
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-background-secondary">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/4">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/4">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[10%]">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Created</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-[15%]">Last Login</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card-background divide-y divide-border-color">
              {users && users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-background-tertiary transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100'
                          : 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleEditUser(user)}
                          tooltip="Edit User"
                        >
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          disabled={deleteUserMutation.isLoading && deleteUserMutation.variables === user.id || user.id === currentUser.id}
                          onClick={() => handleDeleteUser(user)}
                          tooltip={user.id === currentUser.id ? "Cannot delete self" : "Delete User"}
                        >
                          {!(deleteUserMutation.isLoading && deleteUserMutation.variables === user.id) && (
                            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-text-secondary">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {users && users.length > 0 && (
          <div className="px-4 py-3 sm:px-6 border-t border-border-color bg-background-secondary text-right">
            <p className="text-xs text-text-secondary">
              Total Users: <span className="font-medium text-text-primary">{users.length}</span>
            </p>
          </div>
        )}
      </div>
      
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete User"
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to delete the user{' '}
          <strong className="font-medium text-text-primary">{userToDelete?.name}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDeleteUser}
            isLoading={deleteUserMutation.isLoading}
          >
            {deleteUserMutation.isLoading ? 'Deleting...' : 'Delete User'}
          </Button>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default Users;