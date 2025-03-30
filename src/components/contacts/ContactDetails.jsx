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
        <div className="error-alert">
          <div className="alert-icon-container">
            <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="alert-content">
            <p className="alert-message">
              {error?.message || 'Error loading contact details'}
            </p>
          </div>
        </div>
        <div className="action-container">
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
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => navigate('/contacts')}
        >
          <svg className="w-4 h-4 mr-1 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Contacts
        </Button>
      }
    >
      <div className="contact-layout">
        {/* Left column */}
        <div className="contact-sidebar">
          <div className="card">
            <div className="contact-header">
              <h2 className="contact-name">{getDisplayName()}</h2>
              <div className="badge-container">
                <span className={`badge ${contact.customerType === 'company' ? 'badge-indigo' : 'badge-blue'}`}>
                  {contact.customerType === 'company' ? 'Company' : 'Individual'}
                </span>
                
                <span className={`badge ${contact.gdprConsent ? 'badge-green' : 'badge-red'}`}>
                  {contact.gdprConsent ? 'GDPR Consent' : 'No GDPR Consent'}
                </span>
              </div>
            </div>
            
            <div className="card-body">
              <div className="action-row">
                <Button 
                  variant="primary"
                  size="sm"
                  className="btn-list-item btn-list-item--primary"
                  onClick={() => navigate(`/contacts/edit/${contact.id}`)}
                >
                  <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </Button>
                
                <Button 
                  variant="danger"
                  size="sm"
                  className="btn-list-item btn-list-item--danger"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
              
              <div className="contact-info-list">
                {contact.company && (
                  <div className="contact-info-item">
                    <h3 className="info-label">Company</h3>
                    <p className="info-value">{contact.company}</p>
                  </div>
                )}
                
                {contact.email && (
                  <div className="contact-info-item">
                    <h3 className="info-label">Email</h3>
                    <p className="info-value">{contact.email}</p>
                  </div>
                )}
                
                {contact.phone && (
                  <div className="contact-info-item">
                    <h3 className="info-label">Phone</h3>
                    <p className="info-value">{contact.phone}</p>
                  </div>
                )}
                
                {contact.address && (
                  <div className="contact-info-item">
                    <h3 className="info-label">Address</h3>
                    <p className="info-value address-value">{contact.address}</p>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="contact-actions">
                <Button
                  className="btn-list-item btn-list-item--secondary"
                  onClick={() => navigate(`/quotes/new?contactId=${contact.id}`)}
                >
                  <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Quote
                </Button>
                
                <Button
                  className="btn-list-item btn-list-item--secondary"
                  onClick={() => navigate(`/invoices/new?contactId=${contact.id}`)}
                >
                  <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Create Invoice
                </Button>
                
                <Button
                  className="btn-list-item btn-list-item--secondary"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="contact-content">
          <div className="card">
            <Tabs
              tabs={[
                { id: 'details', label: 'Details' },
                { id: 'activity', label: 'Activity' },
                { id: 'gdpr', label: 'GDPR Information' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
              className="tabs-container"
            />
            
            <div className="card-body">
              <TabPanel id="details" activeTab={activeTab}>
                <div className="details-container">
                  {contact.customerType === 'individual' && (
                    <div className="details-section">
                      <h3 className="section-heading">Personal Information</h3>
                      <div className="section-content">
                        <dl className="details-grid">
                          <div className="details-item">
                            <dt className="details-label">First Name</dt>
                            <dd className="details-value">{contact.firstName || '-'}</dd>
                          </div>
                          <div className="details-item">
                            <dt className="details-label">Last Name</dt>
                            <dd className="details-value">{contact.lastName || '-'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                  
                  <div className="details-section">
                    <h3 className="section-heading">Contact Information</h3>
                    <div className="section-content">
                      <dl className="details-grid">
                        <div className="details-item">
                          <dt className="details-label">Email</dt>
                          <dd className="details-value">{contact.email || '-'}</dd>
                        </div>
                        <div className="details-item">
                          <dt className="details-label">Phone</dt>
                          <dd className="details-value">{contact.phone || '-'}</dd>
                        </div>
                        <div className="details-item full-width">
                          <dt className="details-label">Address</dt>
                          <dd className="details-value address-value">{contact.address || '-'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  {contact.notes && (
                    <div className="details-section">
                      <h3 className="section-heading">Notes</h3>
                      <div className="section-content">
                        <p className="notes-text">{contact.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabPanel>
              
              <TabPanel id="activity" activeTab={activeTab}>
                <div className="details-container">
                  <h3 className="section-heading">Activity History</h3>
                  
                  <div className="empty-activity">
                    <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="empty-title">No activity yet</h3>
                    <p className="empty-description">Activity tracking will be available in a future update.</p>
                  </div>
                  
                  <div className="details-section">
                    <h4 className="subsection-heading">Related Documents</h4>
                    
                    <div className="documents-list">
                      <h5 className="document-type">Quotes</h5>
                      <p className="no-documents">No quotes found for this contact.</p>
                      
                      <h5 className="document-type">Invoices</h5>
                      <p className="no-documents">No invoices found for this contact.</p>
                    </div>
                  </div>
                </div>
              </TabPanel>
              
              <TabPanel id="gdpr" activeTab={activeTab}>
                <div className="details-container">
                  <h3 className="section-heading">GDPR Compliance Information</h3>
                  
                  <div className="section-content">
                    <dl className="details-grid">
                      <div className="details-item">
                        <dt className="details-label">Data Processing Consent</dt>
                        <dd className="details-value">
                          {contact.gdprConsent ? (
                            <span className="consent-positive">✓ Consent given</span>
                          ) : (
                            <span className="consent-negative">✕ No consent recorded</span>
                          )}
                        </dd>
                      </div>
                      
                      <div className="details-item">
                        <dt className="details-label">Consent Date</dt>
                        <dd className="details-value">
                          {contact.gdprConsentDate ? new Date(contact.gdprConsentDate).toLocaleDateString() : '-'}
                        </dd>
                      </div>
                      
                      <div className="details-item">
                        <dt className="details-label">Consent Source</dt>
                        <dd className="details-value">{formatConsentSource(contact.gdprConsentSource)}</dd>
                      </div>
                      
                      <div className="details-item">
                        <dt className="details-label">Marketing Consent</dt>
                        <dd className="details-value">
                          {contact.marketingConsent ? (
                            <span className="consent-positive">✓ Marketing allowed</span>
                          ) : (
                            <span className="consent-negative">✕ No marketing consent</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="info-box">
                    <div className="info-icon-container">
                      <svg className="info-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="info-content">
                      <h3 className="info-title">GDPR Information</h3>
                      <div className="info-description">
                        <p>Under GDPR Article 13, data subjects have the right to be informed about the collection and use of their personal data.</p>
                        <p className="info-paragraph">This contact has been informed about:</p>
                        <ul className="info-list">
                          <li>The purposes for processing their personal data</li>
                          <li>The retention periods for their personal data</li>
                          <li>Who it will be shared with</li>
                        </ul>
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
        <div className="dialog-content">
          <p className="dialog-text">
            Are you sure you want to delete this contact? This action cannot be undone.
          </p>
          
          <div className="dialog-contact-name">
            Name: {getDisplayName()}
          </div>
          
          <div className="warning-box">
            <div className="warning-icon-container">
              <svg className="warning-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="warning-content">
              <h3 className="warning-title">GDPR Compliance Note</h3>
              <div className="warning-description">
                <p>Under GDPR regulations, you may need to maintain certain contact information for legitimate business purposes even after deletion.</p>
                <ul className="warning-list">
                  <li>Completed project records</li>
                  <li>Financial transactions</li>
                  <li>Legal compliance</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="checkbox-container">
            <input 
              id="confirm-deletion" 
              type="checkbox" 
              className="form-checkbox"
              onChange={(e) => {
                // In a real app, you'd track this state and use it to enable/disable the delete button
              }}
            />
            <label htmlFor="confirm-deletion" className="checkbox-label">
              I understand the implications of deleting this contact
            </label>
          </div>
        </div>
        
        <div className="dialog-actions">
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
        <div className="dialog-content">
          <p className="dialog-text">
            Export this contact's data for portability or record-keeping purposes.
          </p>
          
          <div className="form-field">
            <label className="form-label">Export Format</label>
            <select 
              className="form-select"
              defaultValue="json"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div className="checkbox-container">
            <input 
              id="include-activity" 
              type="checkbox" 
              className="form-checkbox"
              defaultChecked
            />
            <label htmlFor="include-activity" className="checkbox-label">
              Include Activity History
            </label>
          </div>
          
          <div className="info-box light-blue">
            <h3 className="info-title">GDPR Data Portability</h3>
            <p className="info-description">
              Under GDPR Article 20, data subjects have the right to receive their personal data in a structured, 
              commonly used, and machine-readable format.
            </p>
          </div>
        </div>
        
        <div className="dialog-actions">
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