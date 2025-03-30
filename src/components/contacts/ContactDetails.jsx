import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';

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
  
  // Activity state
  const [newActivityDialogOpen, setNewActivityDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'note',
    title: '',
    description: '',
    timestamp: new Date().toISOString().slice(0, 16), // Format for datetime-local input
    contactId: id,
    relatedDocumentId: null
  });
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleteActivityDialogOpen, setDeleteActivityDialogOpen] = useState(false);
  
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
  
  // Fetch activities data
  const {
    data: activities = [],
    isLoading: activitiesLoading,
    refetch: refetchActivities
  } = useQuery(
    ['contactActivities', id],
    () => api.activities.getByContactId(id),
    {
      enabled: !!id,
      onError: (err) => {
        addNotification(`Error loading activities: ${err.message}`, 'error');
      }
    }
  );
  
  // Add activity mutation
  const addActivityMutation = useMutation(
    (newActivity) => api.activities.create(newActivity),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contactActivities', id]);
        addNotification('Activity added successfully', 'success');
        setNewActivityDialogOpen(false);
        // Reset form
        setNewActivity({
          type: 'note',
          title: '',
          description: '',
          timestamp: new Date().toISOString().slice(0, 16),
          contactId: id,
          relatedDocumentId: null
        });
      },
      onError: (err) => {
        addNotification(`Error adding activity: ${err.message}`, 'error');
      }
    }
  );
  
  // Delete activity mutation
  const deleteActivityMutation = useMutation(
    (activityId) => api.activities.delete(activityId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contactActivities', id]);
        addNotification('Activity deleted successfully', 'success');
        setDeleteActivityDialogOpen(false);
        setActivityToDelete(null);
      },
      onError: (err) => {
        addNotification(`Error deleting activity: ${err.message}`, 'error');
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
  
  // Handle adding a new activity
  const handleAddActivity = () => {
    addActivityMutation.mutate(newActivity);
  };
  
  // Handle deleting an activity
  const handleDeleteActivity = (activity) => {
    setActivityToDelete(activity);
    setDeleteActivityDialogOpen(true);
  };
  
  // Get icon for activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'note':
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'call':
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'meeting':
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="activity-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
    }
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
                { id: 'activity', label: 'Activity' }
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
                  <div className="activity-header">
                    <h3 className="section-heading">Activity History</h3>
                    <Button 
                      variant="primary"
                      size="sm"
                      onClick={() => setNewActivityDialogOpen(true)}
                    >
                      <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Activity
                    </Button>
                  </div>
                  
                  {activitiesLoading ? (
                    <Loading message="Loading activities..." size="sm" />
                  ) : activities && activities.length > 0 ? (
                    <div className="activity-list">
                      {activities.map(activity => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-icon-container">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="activity-content">
                            <div className="activity-header-row">
                              <h4 className="activity-title">{activity.title}</h4>
                              <span className="activity-date">{formatDate(activity.timestamp)}</span>
                            </div>
                            <p className="activity-description">{activity.description}</p>
                            {activity.relatedDocumentId && (
                              <div className="activity-document-link">
                                <a href={`/documents/${activity.relatedDocumentId}`}>
                                  View related document
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="activity-actions">
                            <Button 
                              className="btn-list-item btn-list-item--danger"
                              size="sm"
                              onClick={() => handleDeleteActivity(activity)}
                            >
                              <svg className="button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-activity">
                      <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="empty-title">No activity yet</h3>
                      <p className="empty-description">Keep track of your interactions with this contact.</p>
                      <Button 
                        variant="primary" 
                        onClick={() => setNewActivityDialogOpen(true)}
                      >
                        Add Your First Activity
                      </Button>
                    </div>
                  )}
                  
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
              I understand that this will permanently delete this contact
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
      
      {/* New Activity Dialog */}
      <Dialog
        isOpen={newActivityDialogOpen}
        onClose={() => setNewActivityDialogOpen(false)}
        title="Add Activity"
        size="md"
      >
        <div className="dialog-content">
          <div className="form-field">
            <label className="form-label">Activity Type</label>
            <select 
              className="form-select"
              value={newActivity.type}
              onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
            >
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="document">Document</option>
            </select>
          </div>
          
          <div className="form-field">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={newActivity.title}
              onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
              placeholder="Brief title for this activity"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={newActivity.description}
              onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
              placeholder="Detailed notes about the interaction"
              rows={4}
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={newActivity.timestamp}
              onChange={(e) => setNewActivity({...newActivity, timestamp: e.target.value})}
            />
          </div>
        </div>
        
        <div className="dialog-actions">
          <Button 
            variant="secondary" 
            onClick={() => setNewActivityDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddActivity}
            disabled={!newActivity.title || !newActivity.type}
            isLoading={addActivityMutation.isLoading}
          >
            Add Activity
          </Button>
        </div>
      </Dialog>
      
      {/* Delete Activity Dialog */}
      <Dialog
        isOpen={deleteActivityDialogOpen}
        onClose={() => setDeleteActivityDialogOpen(false)}
        title="Delete Activity"
        size="sm"
      >
        <div className="dialog-content">
          <p className="dialog-text">
            Are you sure you want to delete this activity? This action cannot be undone.
          </p>
          
          {activityToDelete && (
            <div className="activity-item mt-4">
              <div className="activity-icon-container">
                {getActivityIcon(activityToDelete.type)}
              </div>
              <div className="activity-content">
                <div className="activity-header-row">
                  <h4 className="activity-title">{activityToDelete.title}</h4>
                  <span className="activity-date">{formatDate(activityToDelete.timestamp)}</span>
                </div>
                <p className="activity-description">{activityToDelete.description}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="dialog-actions">
          <Button 
            variant="secondary" 
            onClick={() => setDeleteActivityDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              if (activityToDelete) {
                deleteActivityMutation.mutate(activityToDelete.id);
              }
            }}
            isLoading={deleteActivityMutation.isLoading}
          >
            Delete Activity
          </Button>
        </div>
      </Dialog>
    </PageLayout>
  );
};

export default ContactDetails;