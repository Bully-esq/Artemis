import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAppContext } from '../../context/AppContext';
import api from '../../services/api';

// Components
import PageLayout from '../../components/common/PageLayout';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const QuoteBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useAppContext();
  
  // Local state
  const [quoteDetails, setQuoteDetails] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    items: []
  });
  
  // Fetch quote if we have an ID
  const { data: quote, isLoading } = useQuery(
    ['quote', id],
    () => api.quotes.getById(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          setQuoteDetails(data);
        }
      },
      onError: (error) => {
        addNotification(`Error loading quote: ${error.message}`, 'error');
      }
    }
  );
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.quotes.save(quoteDetails);
      addNotification('Quote saved successfully', 'success');
      navigate('/quotes');
    } catch (error) {
      addNotification(`Error saving quote: ${error.message}`, 'error');
    }
  };
  
  if (isLoading) {
    return (
      <PageLayout title={id ? 'Edit Quote' : 'New Quote'}>
        <Loading message="Loading quote details..." />
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title={id ? 'Edit Quote' : 'New Quote'}
      actions={
        <Button variant="secondary" onClick={() => navigate('/quotes')}>
          Back to Quotes
        </Button>
      }
    >
      <div className="bg-white p-6 rounded-md shadow">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quoteDetails.clientName || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, clientName: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quoteDetails.clientCompany || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, clientCompany: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quoteDetails.clientEmail || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, clientEmail: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quoteDetails.clientPhone || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, clientPhone: e.target.value})}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md"
                rows="3"
                value={quoteDetails.clientAddress || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, clientAddress: e.target.value})}
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={quoteDetails.date || ''}
                onChange={(e) => setQuoteDetails({...quoteDetails, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-500 mb-4">
              This is a simplified version of the quote builder. In a complete implementation, 
              you would add UI for managing quote items, calculations, and other details.
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/quotes')}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="primary"
              >
                Save Quote
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default QuoteBuilder;