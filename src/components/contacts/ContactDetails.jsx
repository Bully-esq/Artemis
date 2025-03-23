import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { useAppContext } from '../../context/AppContext';

// Components
import PageLayout from '../common/PageLayout';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Dialog from '../common/Dialog';
import Tabs from '../common/Tabs';
import { TabPanel } from '../common/Tabs';

const ContactDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useAppContext();
  const [activeTab, setActiveTab] = useState('details');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Fetch contact data
  const { 
    data: contact, 
    isLoading, 
    isError, 
    error 
  } = useQuery(
    ['contact', id], 
    () => api.contacts.getById(id),
    {
      onError: (err) => {
        addNotification(`Error loading contact: ${err.message}`, 'error');
      }
    }
  );
  
  // Delete contact mutation
  const deleteContactMutation = useMutation(
    () => api.contacts.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contacts');
        addNotification('Contact deleted successfully', 'success');
        navigate('/contacts');
      },
      onError: (err) => {
        addNotification(`Error deleting contact: ${err.message}`, 'error');
      }
    }
  );

  // Loading state
  if (isLoading) {
    return <Loading message="Loading contact details..." fullScreen />;
  }
  
  // Error state
  if (isError) {
    return (
      <PageLayout title="Contact Details">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error?.message || 'Error loading contact details'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => navigate('/contacts')}>Back to Contacts</Button>
        </div>
      </PageLayout>
    );
  }
  
  // Handle export data
  const handleExportData = (format) => {
    // In a real app, you would generate and download the file here
    addNotification(`Exporting contact data as ${format.toUpperCase()}`, 'info');
    setExportDialogOpen(false);
    
    // Example of what this might look like
    setTimeout(() => {
      addNotification('Contact data exported successfully', 'success');
    }, 1500);
  };

  // Format display name based on contact type
  const getDisplayName = () => {
    if (contact.customerType === 'company') {
      return contact.company || 'Unnamed Company';
    } else {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact';
    }
  };
  
  // Format consent source for display
  const formatConsentSource = (source) => {
    const sources = {
      'form': 'Website Contact Form',
      'email': 'Email Consent',
      'phone': 'Phone Call',
      'in-person': 'In-Person Agreement',
      'contract': 'Contract/Agreement',
      'other': 'Other Source'
    };
    return sources[source] || source || '-';
  };
  
  return (
    <PageLayout
      title="Contact Details"
      actions={
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/contacts')}
          >
            Back to Contacts
          </Button>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column */}
        <div className="md:w-1/3">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{getDisplayName()}</h2>
              <div className="mt-1 flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium 
                  ${contact.customerType === 'company' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>
                  {contact.customerType === 'company' ? 'Company' : 'Individual'}
                </span>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium 
                  ${contact.gdprConsent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {contact.gdprConsent ? 'GDPR Consent' : 'No GDPR Consent'}
                </span>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex justify-between mb-6">
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/contacts/edit/${contact.id}`)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </Button>
                
                <Button 
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
              
              <div className="space-y-4">
                {contact.company && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Company</h3>
                    <p className="mt-1 text-sm text-gray-900">{contact.company}</p>
                  </div>
                )}
                
                {contact.email && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1 text-sm text-gray-900">{contact.email}</p>
                  </div>
                )}
                
                {contact.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="mt-1 text-sm text-gray-900">{contact.phone}</p>
                  </div>
                )}
                
                {contact.address && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Address</h3>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{contact.address}</p>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/quotes/new?contactId=${contact.id}`)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Quote
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/invoices/new?contactId=${contact.id}`)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Create Invoice
                </Button>
                
                <Button
                  variant="secondary"
                  className="col-span-2"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="md:w-2/3">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Tabs
              tabs={[
                { id: 'details', label: 'Details' },
                { id: 'activity', label: 'Activity' },
                { id: 'gdpr', label: 'GDPR Information' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
              className="px-6 pt-4"
            />
            
            <div className="px-6 pb-6">
              <TabPanel id="details" activeTab={activeTab}>
                <div className="space-y-6">
                  {contact.customerType === 'individual' && (
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Personal Information</h3>
                      <div className="mt-2 border-t border-gray-200 pt-4">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">First Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{contact.firstName || '-'}</dd>
                          </div>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{contact.lastName || '-'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Contact Information</h3>
                    <div className="mt-2 border-t border-gray-200 pt-4">
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{contact.email || '-'}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">{contact.phone || '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">{contact.address || '-'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  {contact.notes && (
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Notes</h3>
                      <div className="mt-2 border-t border-gray-200 pt-4">
                        <p className="text-sm text-gray-900 whitespace-pre-line">{contact.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabPanel>
              
              <TabPanel id="activity" activeTab={activeTab}>
                <div className="space-y-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Activity History</h3>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Activity tracking will be available in a future update.</p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-md font-medium text-gray-900">Related Documents</h4>
                    
                    <div className="mt-4 space-y-4">
                      <h5 className="text-sm font-medium text-gray-700">Quotes</h5>
                      <p className="text-sm text-gray-500 italic">No quotes found for this contact.</p>
                      
                      <h5 className="text-sm font-medium text-gray-700">Invoices</h5>
                      <p className="text-sm text-gray-500 italic">No invoices found for this contact.</p>
                    </div>
                  </div>
                </div>
              </TabPanel>
              
              <TabPanel id="gdpr" activeTab={activeTab}>
                <div className="space-y-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">GDPR Compliance Information</h3>
                  
                  <div className="mt-2 border-t border-gray-200 pt-4">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Data Processing Consent</dt>
                        <dd className="mt-1 text-sm">
                          {contact.gdprConsent ? (
                            <span className="text-green-600 font-medium">✓ Consent given</span>
                          ) : (
                            <span className="text-red-600 font-medium">✕ No consent recorded</span>
                          )}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Consent Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {contact.gdprConsentDate ? new Date(contact.gdprConsentDate).toLocaleDateString() : '-'}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Consent Source</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatConsentSource(contact.gdprConsentSource)}</dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Marketing Consent</dt>
                        <dd className="mt-1 text-sm">
                          {contact.marketingConsent ? (
                            <span className="text-green-600 font-medium">✓ Marketing allowed</span>
                          ) : (
                            <span className="text-red-600 font-medium">✕ No marketing consent</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="bg-blue-50 rounded-md p-4 mt-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">GDPR Information</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Under GDPR Article 13, data subjects have the right to be informed about the collection and use of their personal data.</p>
                          <p className="mt-2">This contact has been informed about:</p>
                          <ul className="list-disc list-inside mt-1">
                            <li>The purposes for processing their personal data</li>
                            <li>The retention periods for their personal data</li>
                            <li>Who it will be shared with</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Contact"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this contact? This action cannot be undone.
          </p>
          
          <div className="font-medium">
            Name: {getDisplayName()}
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">GDPR Compliance Note</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>Under GDPR regulations, you may need to maintain certain contact information for legitimate business purposes even after deletion.</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Completed project records</li>
                    <li>Financial transactions</li>
                    <li>Legal compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center mt-4">
            <input 
              id="confirm-deletion" 
              type="checkbox" 
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              onChange={(e) => {
                // In a real app, you'd track this state and use it to enable/disable the delete button
              }}
            />
            <label htmlFor="confirm-deletion" className="ml-2 block text-sm text-gray-900">
              I understand the implications of deleting this contact
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => setDeleteDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              deleteContactMutation.mutate();
              setDeleteDialogOpen(false);
            }}
            isLoading={deleteContactMutation.isLoading}
          >
            Delete Contact
          </Button>
        </div>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title="Export Contact Data"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Export this contact's data for portability or record-keeping purposes.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
            <select 
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              defaultValue="json"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input 
              id="include-activity" 
              type="checkbox" 
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              defaultChecked
            />
            <label htmlFor="include-activity" className="ml-2 block text-sm text-gray-900">
              Include Activity History
            </label>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-800">GDPR Data Portability</h3>
            <p className="mt-1 text-sm text-blue-700">
              Under GDPR Article 20, data subjects have the right to receive their personal data in a structured, 
              commonly used, and machine-readable format.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => setExportDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleExportData('json')}
          >
            Download Data
          </Button>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default ContactDetails;