import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from 'react-query';
import '../styles/index.css';
import PageLayout from '../components/common/PageLayout';
import Tabs from '../components/common/Tabs';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ToggleSwitch from '../components/common/ToggleSwitch'; 
import { useAppContext } from '../context/AppContext';
import api from '../services/api';
import { deepMerge } from '../utils/deepMerge';

const Settings = () => {
  const { 
    settings, 
    updateSettings, 
    addNotification, 
    settingsCircuitBroken, 
    resetSettingsCircuitBreaker 
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('company');
  const [isLoading, setIsLoading] = useState(true);
  const [localSettings, setLocalSettings] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Handle input change with better debugging
  const handleChange = (section, field, value) => {
    console.log(`Settings change: ${section}.${field} = ${JSON.stringify(value)}`);
    
    // Add more detailed check for vat.enabled case
    if (section === 'vat' && field === 'enabled') {
      console.log(`VAT toggle clicked - changing from ${localSettings?.vat?.enabled} to ${value}`);
    }

    setLocalSettings(prevSettings => {
      // Make a deep copy of previous settings to avoid mutation issues
      const newSettings = JSON.parse(JSON.stringify(prevSettings || {}));
      
      // Ensure the section exists
      if (!newSettings[section]) {
        newSettings[section] = {};
      }
      
      // Update the field with the new value
      newSettings[section][field] = value;
      
      console.log(`New settings state for ${section}.${field}:`, newSettings[section]);
      return newSettings;
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
      setLogoPreview(event.target.result);
      handleChange('company', 'logo', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (localSettings === null) {
      addNotification('Settings not loaded yet.', 'error');
      return;
    }
    try {
      // Update cache before attempting API call to ensure fallbacks work
      localStorage.setItem('cachedSettings', JSON.stringify(localSettings));
      
      // Try API call
      await saveSettingsMutation.mutateAsync(localSettings);
    } catch (err) {
      console.error('Error initiating settings save:', err);
      // Even if API call fails, we've already updated the cache
      addNotification('Settings saved locally. Some changes may not sync to the server.', 'warning');
      updateSettings(localSettings);
    }
  };
  
  // Handle reset circuit breaker
  const handleResetCircuitBreaker = () => {
    if (resetSettingsCircuitBreaker()) {
      addNotification('Settings circuit breaker has been reset. Reload the page to retry loading settings.', 'info', 5000);
    }
  };

  // Prepare mutation for saving settings 
  const saveSettingsMutation = useMutation(
    (newSettings) => {
      console.log("Saving settings:", newSettings);
      // Parse number values before saving
      const processedSettings = {
        ...newSettings,
        quote: newSettings.quote ? {
          ...newSettings.quote,
          defaultMarkup: parseFloat(newSettings.quote.defaultMarkup) || 0, // Use parseFloat for potential decimals
          validityPeriod: parseInt(newSettings.quote.validityPeriod) || 30,
        } : {},
        invoice: newSettings.invoice ? {
          ...newSettings.invoice,
          defaultPaymentTerms: parseInt(newSettings.invoice.defaultPaymentTerms) || 0,
        } : {},
        // Add VAT parsing - ensure boolean conversion for enabled
        vat: newSettings.vat ? {
          ...newSettings.vat,
          rate: parseFloat(newSettings.vat.rate) || 0, // Parse VAT rate
          enabled: Boolean(newSettings.vat.enabled), // Ensure boolean
          number: newSettings.vat.number || ''
        } : { enabled: false, rate: 20, number: '' }, // Default VAT structure
      };
      console.log("Processed settings:", processedSettings);
      return api.settings.save(processedSettings);
    },
    {
      onSuccess: (data) => { // Pass saved data to updateSettings
        console.log("Settings saved successfully:", data);
        updateSettings(data); // Update context with the processed settings returned from API
        addNotification('Settings saved successfully', 'success');
      },
      onError: (error) => {
        console.error("Error saving settings:", error);
        addNotification(`Error saving settings: ${error.message}`, 'error');
      }
    }
  );

  // Load settings only once when component mounts and settings are available
  useEffect(() => {
    // Only initialize if settings are loaded and we haven't initialized yet
    if (settings && !isInitialized) {
      // Define the default structure, including nested objects
      const defaultStructure = {
        company: { name: '', contactName: '', email: '', phone: '', website: '', address: '', logo: null },
        quote: { defaultMarkup: 0, prefix: 'Q-', validityPeriod: 30, defaultTerms: '1' },
        invoice: { prefix: 'INV-', defaultPaymentTerms: 30, notesTemplate: '', footer: '' },
        bank: { name: '', accountName: '', accountNumber: '', sortCode: '', iban: '', bic: '' },
        cis: { companyName: '', utr: '', niNumber: '' },
        vat: { enabled: false, rate: 20, number: '' },
      };

      // Deep merge the loaded settings onto the default structure
      const initialSettings = deepMerge(defaultStructure, settings);

      setLocalSettings(initialSettings);
      setLogoPreview(initialSettings.company?.logo || null);
      setIsInitialized(true);
      setIsLoading(false);
    }
    // If settings are not yet loaded, keep loading
    else if (!settings) {
      setIsLoading(true);
    }
    // If settings are loaded but we are already initialized, do nothing
    else if (settings && isInitialized) {
      setIsLoading(false);
    }
  }, [settings, isInitialized]);

  // Show loading indicator if still loading OR if localSettings is null
  if (isLoading || localSettings === null) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  return (
    <PageLayout title="Settings">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure your business settings</p>
        
        {/* Add circuit breaker status indicator */}
        {settingsCircuitBroken && (
          <div 
            style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '10px 15px',
              borderRadius: '5px',
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <strong>Notice:</strong> Settings are using local cache due to network issues.
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetCircuitBreaker}
            >
              Reset & Retry
            </Button>
          </div>
        )}
      </div>

      <div className="card settings-card">
        <div className="card-content">
          <Tabs
            tabs={[
              { id: 'company', label: 'Company Details' },
              { id: 'quote', label: 'Quote Settings' },
              { id: 'invoice', label: 'Invoice Settings' },
              { id: 'bank', label: 'Bank Details' },
              { id: 'cis', label: 'CIS Settings' },
              { id: 'vat', label: 'VAT Settings' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            className="settings-tabs"
            style={{ gap: '2rem', display: 'flex' }}
          />

          {/* Company Details */}
          {activeTab === 'company' && (
            <div className="settings-section">
              <div className="logo-upload-container">
                <label className="field-label">Company Logo</label>
                <div className="logo-upload-area">
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current.click()}
                    >
                      Upload Logo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden-input"
                      onChange={handleLogoUpload}
                    />
                    <p className="helper-text">Recommended size: 300x100px</p>
                  </div>
                  {logoPreview && (
                    <div className="logo-preview">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="logo-image"
                      />
                      <button
                        className="delete-button"
                        onClick={() => {
                          setLogoPreview(null);
                          handleChange('company', 'logo', null);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="delete-icon"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <FormField
                label="Company Name"
                name="company-name"
                value={localSettings.company?.name || ''}
                onChange={(e) => handleChange('company', 'name', e.target.value)}
              />

              <FormField
                label="Contact Name"
                name="contact-name"
                value={localSettings.company?.contactName || ''}
                onChange={(e) => handleChange('company', 'contactName', e.target.value)}
              />

              <div className="form-row">
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  value={localSettings.company?.email || ''}
                  onChange={(e) => handleChange('company', 'email', e.target.value)}
                />
                <FormField
                  label="Phone"
                  name="phone"
                  value={localSettings.company?.phone || ''}
                  onChange={(e) => handleChange('company', 'phone', e.target.value)}
                />
              </div>

              <FormField
                label="Website"
                name="website"
                value={localSettings.company?.website || ''}
                onChange={(e) => handleChange('company', 'website', e.target.value)}
              />

              <FormField
                label="Address"
                name="address"
                type="textarea"
                value={localSettings.company?.address || ''}
                onChange={(e) => handleChange('company', 'address', e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Quote Settings */}
          {activeTab === 'quote' && (
            <div className="settings-section">
              <FormField
                label="Default Markup (%)"
                name="default-markup"
                type="number"
                min={0}
                max={100}
                value={localSettings.quote?.defaultMarkup ?? ''}
                onChange={(e) =>
                  handleChange('quote', 'defaultMarkup', e.target.value)
                }
                helpText="Default markup percentage applied to new quotes"
              />

              <FormField
                label="Quote Number Prefix"
                name="quote-prefix"
                value={localSettings.quote?.prefix || 'Q-'}
                onChange={(e) => handleChange('quote', 'prefix', e.target.value)}
                helpText="Prefix added to quote numbers (e.g. Q-2025-001)"
              />

              <FormField
                label="Default Validity Period (days)"
                name="validity-period"
                type="number"
                min={1}
                value={localSettings.quote?.validityPeriod ?? ''}
                onChange={(e) =>
                  handleChange('quote', 'validityPeriod', e.target.value)
                }
                helpText="How long quotes are valid for by default"
              />

              <FormField
                label="Default Payment Terms"
                name="default-terms"
                type="select"
                value={localSettings.quote?.defaultTerms || '1'}
                onChange={(e) => handleChange('quote', 'defaultTerms', e.target.value)}
              >
                <option value="1">50% deposit, 50% on completion</option>
                <option value="2">50% deposit, 25% on joinery completion, 25% final</option>
                <option value="4">Full payment before delivery</option>
                <option value="3">Custom terms</option>
              </FormField>
            </div>
          )}

          {/* Invoice Settings */}
          {activeTab === 'invoice' && (
            <div className="settings-section">
              <FormField
                label="Invoice Number Prefix"
                name="invoice-prefix"
                value={localSettings.invoice?.prefix || 'INV-'}
                onChange={(e) => handleChange('invoice', 'prefix', e.target.value)}
                helpText="Prefix added to invoice numbers (e.g. INV-2025-001)"
              />

              <FormField
                label="Default Payment Terms (days)"
                name="payment-terms"
                type="number"
                min={0}
                value={localSettings.invoice?.defaultPaymentTerms ?? ''}
                onChange={(e) =>
                  handleChange('invoice', 'defaultPaymentTerms', e.target.value)
                }
                helpText="Number of days before payment is due"
              />

              <FormField
                label="Default Invoice Notes"
                name="notes-template"
                type="textarea"
                value={localSettings.invoice?.notesTemplate || ''}
                onChange={(e) =>
                  handleChange('invoice', 'notesTemplate', e.target.value)
                }
                rows={4}
                helpText="Default notes to include on new invoices"
              />

              <FormField
                label="Invoice Footer Text"
                name="invoice-footer"
                type="textarea"
                value={localSettings.invoice?.footer || ''}
                onChange={(e) => handleChange('invoice', 'footer', e.target.value)}
                rows={3}
                helpText="Text to appear at the bottom of all invoices"
              />
            </div>
          )}

          {/* Bank Details */}
          {activeTab === 'bank' && (
            <div className="settings-section">
              <FormField
                label="Bank Name"
                name="bank-name"
                value={localSettings.bank?.name || ''}
                onChange={(e) => handleChange('bank', 'name', e.target.value)}
              />

              <FormField
                label="Account Name"
                name="account-name"
                value={localSettings.bank?.accountName || ''}
                onChange={(e) => handleChange('bank', 'accountName', e.target.value)}
              />

              <div className="form-row">
                <FormField
                  label="Account Number"
                  name="account-number"
                  value={localSettings.bank?.accountNumber || ''}
                  onChange={(e) => handleChange('bank', 'accountNumber', e.target.value)}
                />
                <FormField
                  label="Sort Code"
                  name="sort-code"
                  value={localSettings.bank?.sortCode || ''}
                  onChange={(e) => handleChange('bank', 'sortCode', e.target.value)}
                />
              </div>

              <FormField
                label="IBAN (Optional)"
                name="iban"
                value={localSettings.bank?.iban || ''}
                onChange={(e) => handleChange('bank', 'iban', e.target.value)}
                helpText="International Bank Account Number"
              />

              <FormField
                label="BIC/SWIFT (Optional)"
                name="bic"
                value={localSettings.bank?.bic || ''}
                onChange={(e) => handleChange('bank', 'bic', e.target.value)}
                helpText="Bank Identifier Code"
              />
            </div>
          )}

          {/* CIS Settings */}
          {activeTab === 'cis' && (
            <div className="settings-section">
              <div className="notification-box warning">
                <h3 className="notification-title">Construction Industry Scheme</h3>
                <p className="notification-text">
                  These settings are used for CIS tax deductions on invoices. 
                  Make sure these details are correct to comply with HMRC regulations.
                </p>
              </div>

              <FormField
                label="Company Name for CIS"
                name="cis-company-name"
                value={localSettings.cis?.companyName || ''}
                onChange={(e) => handleChange('cis', 'companyName', e.target.value)}
              />

              <FormField
                label="UTR Number"
                name="cis-utr"
                value={localSettings.cis?.utr || ''}
                onChange={(e) => handleChange('cis', 'utr', e.target.value)}
                helpText="Your Unique Taxpayer Reference number"
              />

              <FormField
                label="National Insurance Number"
                name="cis-ni-number"
                value={localSettings.cis?.niNumber || ''}
                onChange={(e) => handleChange('cis', 'niNumber', e.target.value)}
              />
            </div>
          )}

          {/* VAT Settings */}
          {activeTab === 'vat' && (
            <div className="settings-section">
              <div className="notification-box info">
                <h3 className="notification-title">VAT Configuration</h3>
                <p className="notification-text">
                  Enable VAT to automatically apply it to quotes and invoices. 
                  The VAT number will be displayed on relevant documents when enabled.
                </p>
              </div>

              <div 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  borderRadius: '5px',
                  marginBottom: '20px' 
                }}
              >
                <h3 style={{ marginTop: 0 }}>Current VAT Status:</h3>
                <p>VAT is currently <strong>{localSettings?.vat?.enabled ? 'ENABLED' : 'DISABLED'}</strong></p>
                <p>Click the toggle below to change this setting.</p>
                
                {/* Fallback direct button in case the toggle has issues */}
                <Button
                  variant={localSettings?.vat?.enabled ? "danger" : "primary"}
                  onClick={() => {
                    const newValue = !localSettings?.vat?.enabled;
                    console.log(`Direct VAT toggle button clicked. Current: ${localSettings?.vat?.enabled}, New: ${newValue}`);
                    handleChange('vat', 'enabled', newValue);
                  }}
                  style={{ marginTop: '10px' }}
                >
                  {localSettings?.vat?.enabled ? "Disable VAT" : "Enable VAT"}
                </Button>
              </div>

              <ToggleSwitch
                label="Enable VAT"
                checked={Boolean(localSettings?.vat?.enabled)}
                onChange={(isChecked) => {
                  console.log(`VAT Toggle onChange fired with value: ${isChecked}`);
                  handleChange('vat', 'enabled', isChecked);
                }}
                helpText="Apply VAT calculations and display VAT details on documents."
                name="vat-enabled-toggle"
              />

              {/* Only show rate and number fields if VAT is enabled */}
              {localSettings?.vat?.enabled && (
                <>
                  <FormField
                    label="VAT Rate (%)"
                    name="vat-rate"
                    type="number"
                    min={0}
                    step={0.01}
                    value={localSettings.vat?.rate ?? ''}
                    onChange={(e) => handleChange('vat', 'rate', e.target.value)}
                    helpText="Standard VAT rate to apply (e.g., 20 for 20%)"
                  />

                  <FormField
                    label="VAT Registration Number"
                    name="vat-number"
                    value={localSettings.vat?.number || ''}
                    onChange={(e) => handleChange('vat', 'number', e.target.value)}
                    helpText="Your company's VAT registration number."
                  />
                </>
              )}
            </div>
          )}

          <div className="action-buttons">
            <Button
              variant="green"
              onClick={handleSaveSettings}
              isLoading={saveSettingsMutation.isLoading}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;