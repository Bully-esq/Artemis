import React from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import Loading from '../common/Loading';
import Button from '../common/Button';

const ContactSelector = ({ searchTerm = '', onContactSelect }) => {
  // Fetch contacts
  const { data: contacts = [], isLoading, isError, error } = useQuery(
    'contacts',
    api.contacts.getAll,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Filter contacts based on search term
  const filteredContacts = searchTerm
    ? contacts.filter(contact => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (contact.firstName && contact.firstName.toLowerCase().includes(searchLower)) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(searchLower)) ||
          (contact.company && contact.company.toLowerCase().includes(searchLower)) ||
          (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchLower))
        );
      })
    : contacts;

  // Sort contacts by name (lastName, firstName) or company
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.customerType === 'company' && b.customerType !== 'company') return -1;
    if (a.customerType !== 'company' && b.customerType === 'company') return 1;
    
    if (a.customerType === 'company') {
      return a.company.localeCompare(b.company);
    } else {
      // Compare by lastName, then firstName
      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    }
  });

  // Display name helper function
  const getDisplayName = (contact) => {
    if (contact.customerType === 'company') {
      return contact.company || 'Unnamed Company';
    } else {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact';
    }
  };

  // Loading state
  if (isLoading) return <Loading message="Loading contacts..." size="sm" />;

  // Error state
  if (isError) {
    return (
      <div className="p-4 text-center text-red-600 bg-red-100 border border-red-200 rounded-md">
        <p>Error loading contacts: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto p-1">
      {sortedContacts.length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          {searchTerm 
            ? `No contacts match "${searchTerm}"`
            : 'No contacts found'
          }
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {sortedContacts.map(contact => (
            <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
              <div className="flex-grow min-w-0 mr-4">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contact.customerType === 'company' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800' }`}>
                    {contact.customerType === 'company' ? 'Company' : 'Individual'}
                  </span>
                  <h3 className="text-sm font-medium text-gray-900 truncate">{getDisplayName(contact)}</h3>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {contact.email && <p className="truncate">{contact.email}</p>}
                  {contact.phone && <p>{contact.phone}</p>}
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => onContactSelect(contact)}
              >
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactSelector;