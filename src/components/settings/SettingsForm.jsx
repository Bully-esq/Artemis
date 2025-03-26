import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useMutation } from 'react-query';
import api from '../../services/api';

// Components
import Tabs, { TabPanel } from '../common/Tabs';
import FormField from '../common/FormField';
import Button from '../common/Button';
import Loading from '../common/Loading';

/**
 * Settings form component with multiple sections
 */
const SettingsForm = () => {
  // Get settings from app context
  const { settings: contextSettings, updateSettings, addNotification } = useAppContext();
  
  // Local state for form
  const [settings, setSettings] = useState({...contextSettings});
  const [activeTab, setActiveTab] = useState('company');
  const [logoPreview, setLogoPreview] = useState(contextSettings.company?.logo || null);
  
  // Update local state when context settings change
  useEffect(() => {
    setSettings({...contextSettings});
    setLogoPreview(contextSettings.company?.logo || null);
  }, [contextSettings]);
  
  // Mutation for saving settings
  const saveSettingsMutation = useMutation(
    (newSettings) => api.settings.save(newSettings),
    {
      onSuccess: () => {
        // Update context settings
        updateSettings(settings);
        addNotification('Settings saved successfully', 'success');
      },
      onError: (error) => {
        addNotification(`Error saving settings: ${error.message}`, 'error');
      }
    }
  );
  
  // Handle input changes for nested objects
  const handleChange = (section, field, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    });
  };
  
  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      addNotification('Please select an image file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoData = event.target.result;
      setLogoPreview(logoData);
      handleChange('company', 'logo', logoData);
    };
    
    reader.readAsDataURL(file);
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save the settings exactly as entered without applying defaults
    saveSettingsMutation.mutate(settings);
  };
  
  // If settings are not loaded yet
  if (!settings) {
    return <Loading message="Loading settings..." />;
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <Tabs
        tabs={[
          { id: 'company', label: 'Company Details' },
          { id: 'quote', label: 'Quote Settings' },
          { id: 'invoice', label: 'Invoice Settings' },
          { id: 'cis', label: 'CIS Settings' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
        className="px-4 pt-4"
      />
      
      <form onSubmit={handleSubmit} className="p-6">
        {/* Company Details Tab */}
        <TabPanel id="company" activeTab={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Company Information</h3>
            </div>
            
            {/* Logo upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex-1">
                  <label 
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md 
                              shadow-sm text-sm font-medium text-gray-700 bg-white 
                              hover:bg-gray-50 focus:outline-none cursor-pointer"
                  >
                    Choose Logo
                  </label>
                </div>
                {logoPreview && (
                  <div className="w-40 h-20 flex items-center justify-center overflow-hidden border border-gray-200 rounded-md">
                    <img 
                      src={logoPreview} 
                      alt="Company Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <FormField
              label="Company Name"
              name="company-name"
              value={settings.company.name || ''}
              onChange={(e) => handleChange('company', 'name', e.target.value)}
              required
            />
            
            <FormField
              label="Contact Name"
              name="contact-name"
              value={settings.company.contactName || ''}
              onChange={(e) => handleChange('company', 'contactName', e.target.value)}
            />
            
            <FormField
              label="Email"
              name="company-email"
              type="email"
              value={settings.company.email || ''}
              onChange={(e) => handleChange('company', 'email', e.target.value)}
            />
            
            <FormField
              label="Phone"
              name="company-phone"
              value={settings.company.phone || ''}
              onChange={(e) => handleChange('company', 'phone', e.target.value)}
            />
            
            <FormField
              label="Website"
              name="company-website"
              value={settings.company.website || ''}
              onChange={(e) => handleChange('company', 'website', e.target.value)}
            />
            
            <div className="md:col-span-2">
              <FormField
                label="Address"
                name="company-address"
                type="textarea"
                value={settings.company.address || ''}
                onChange={(e) => handleChange('company', 'address', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </TabPanel>
        
        {/* Quote Settings Tab */}
        <TabPanel id="quote" activeTab={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Quote Settings</h3>
            </div>
            
            <FormField
              label="Quote Number Prefix"
              name="quote-prefix"
              value={settings.quote.prefix || 'Q-'}
              onChange={(e) => handleChange('quote', 'prefix', e.target.value)}
              helpText="Prefix used for quote numbers (e.g. Q-2023-001)"
            />
            
            <FormField
              label="Default Markup (%)"
              name="default-markup"
              type="number"
              min={0}
              max={100}
              value={settings.quote.defaultMarkup || ''}
              onChange={(e) => handleChange('quote', 'defaultMarkup', e.target.value)}
              helpText="Default markup percentage applied to new quotes"
            />
            
            <FormField
              label="Default Validity Period (days)"
              name="validity-period"
              type="number"
              value={settings.quote.validityPeriod || ''}
              onChange={(e) => handleChange('quote', 'validityPeriod', e.target.value)}
              helpText="How long quotes are valid for by default"
            />
            
            <FormField
              label="Default Payment Terms"
              name="default-terms"
              type="select"
              value={settings.quote.defaultTerms || '1'}
              onChange={(e) => handleChange('quote', 'defaultTerms', e.target.value)}
            >
              <option value="1">50% deposit, remainder due on completion</option>
              <option value="2">50% deposit, 25% on joinery completion, 25% on completion</option>
              <option value="4">Full payment before delivery</option>
              <option value="3">Custom terms</option>
            </FormField>
            
            <div className="md:col-span-2">
              <FormField
                label="Standard Quote Notes"
                name="quote-notes"
                type="textarea"
                value={settings.quote.notesTemplate || ''}
                onChange={(e) => handleChange('quote', 'notesTemplate', e.target.value)}
                helpText="These notes will be added to all new quotes by default"
                rows={3}
              />
            </div>
          </div>
        </TabPanel>
        
        {/* Invoice Settings Tab */}
        <TabPanel id="invoice" activeTab={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Invoice Settings</h3>
            </div>
            
            <FormField
              label="Invoice Number Prefix"
              name="invoice-prefix"
              value={settings.invoice.prefix || 'INV-'}
              onChange={(e) => handleChange('invoice', 'prefix', e.target.value)}
              helpText="Prefix used for invoice numbers (e.g. INV-2023-001)"
            />
            
            <FormField
              label="Default Payment Terms (days)"
              name="payment-terms"
              type="number"
              min={0}
              value={settings.invoice.defaultPaymentTerms || ''}
              onChange={(e) => handleChange('invoice', 'defaultPaymentTerms', e.target.value)}
              helpText="Days until payment is due by default"
            />
            
            <div className="md:col-span-2">
              <FormField
                label="Default Invoice Notes"
                name="invoice-notes"
                type="textarea"
                value={settings.invoice.notesTemplate || ''}
                onChange={(e) => handleChange('invoice', 'notesTemplate', e.target.value)}
                helpText="These notes will be added to all new invoices by default"
                rows={3}
              />
            </div>
            
            <div className="md:col-span-2">
              <FormField
                label="Invoice Footer Text"
                name="invoice-footer"
                type="textarea"
                value={settings.invoice.footer || 'Thank you for your business.'}
                onChange={(e) => handleChange('invoice', 'footer', e.target.value)}
                helpText="This text appears at the bottom of all invoices"
                rows={2}
              />
            </div>
            
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Bank Details</h3>
              <p className="text-sm text-gray-500 mb-4">
                These details will appear on your invoices for payment instructions.
              </p>
            </div>
            
            <FormField
              label="Bank Name"
              name="bank-name"
              value={settings.invoice.bankName || ''}
              onChange={(e) => handleChange('invoice', 'bankName', e.target.value)}
            />
            
            <FormField
              label="Account Name"
              name="account-name"
              value={settings.invoice.accountName || ''}
              onChange={(e) => handleChange('invoice', 'accountName', e.target.value)}
            />
            
            <FormField
              label="Account Number"
              name="account-number"
              value={settings.invoice.accountNumber || ''}
              onChange={(e) => handleChange('invoice', 'accountNumber', e.target.value)}
            />
            
            <FormField
              label="Sort Code"
              name="sort-code"
              value={settings.invoice.sortCode || ''}
              onChange={(e) => handleChange('invoice', 'sortCode', e.target.value)}
            />
            
            <FormField
              label="IBAN (Optional)"
              name="iban"
              value={settings.invoice.iban || ''}
              onChange={(e) => handleChange('invoice', 'iban', e.target.value)}
            />
            
            <FormField
              label="BIC/SWIFT (Optional)"
              name="bic"
              value={settings.invoice.bic || ''}
              onChange={(e) => handleChange('invoice', 'bic', e.target.value)}
            />
          </div>
        </TabPanel>
        
        {/* CIS Settings Tab */}
        <TabPanel id="cis" activeTab={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Construction Industry Scheme Settings</h3>
              <p className="text-sm text-gray-500 mb-6">
                These details are used for CIS deductions on invoices in accordance with HMRC requirements.
              </p>
            </div>
            
            <FormField
              label="Company Name for CIS"
              name="cis-company-name"
              value={settings.cis.companyName || ''}
              onChange={(e) => handleChange('cis', 'companyName', e.target.value)}
              helpText="Company name as registered with HMRC for CIS"
            />
            
            <FormField
              label="UTR Number"
              name="cis-utr"
              value={settings.cis.utr || ''}
              onChange={(e) => handleChange('cis', 'utr', e.target.value)}
              helpText="Your Unique Taxpayer Reference"
            />
            
            <FormField
              label="National Insurance Number"
              name="cis-ni-number"
              value={settings.cis.niNumber || ''}
              onChange={(e) => handleChange('cis', 'niNumber', e.target.value)}
            />
            
            <FormField
              label="Default CIS Rate (%)"
              name="cis-rate"
              type="number"
              min={0}
              max={30}
              value={settings.cis.defaultRate || ''}
              onChange={(e) => handleChange('cis', 'defaultRate', e.target.value)}
              helpText="Standard CIS deduction rate (typically 20%)"
            />
          </div>
        </TabPanel>
        
        {/* Submit button */}
        <div className="mt-8 border-t border-gray-200 pt-5">
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={saveSettingsMutation.isLoading}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsForm;