import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from 'react-query';
import '../App.css';
import PageLayout from '../components/common/PageLayout';
import Tabs from '../components/common/Tabs';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import { useAppContext } from '../context/AppContext';
import api from '../services/api';

const Settings = () => {
  const { settings, updateSettings, addNotification } = useAppContext();
  const [activeTab, setActiveTab] = useState('company');
  const [isLoading, setIsLoading] = useState(true);
  const [localSettings, setLocalSettings] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Prepare mutation for saving settings 
  const saveSettingsMutation = useMutation(
    (newSettings) => {
      // Parse number values before saving
      const processedSettings = {
        ...newSettings,
        quote: newSettings.quote ? {
          ...newSettings.quote,
          defaultMarkup: parseInt(newSettings.quote.defaultMarkup) || 0,
          validityPeriod: parseInt(newSettings.quote.validityPeriod) || 30,
        } : {},
        invoice: newSettings.invoice ? {
          ...newSettings.invoice,
          defaultPaymentTerms: parseInt(newSettings.invoice.defaultPaymentTerms) || 0,
        } : {},
      };
      return api.settings.save(processedSettings);
    },
    {
      onSuccess: () => {
        updateSettings(localSettings);
        addNotification('Settings saved successfully', 'success');
      },
      onError: (error) => {
        addNotification(`Error saving settings: ${error.message}`, 'error');
      }
    }
  );

  // Load settings when component mounts
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setLogoPreview(settings.company?.logo || null);
      setIsLoading(false);
    }
  }, [settings]);

  // Handle input change
  const handleChange = (section, field, value) => {
    setLocalSettings({
      ...localSettings,
      [section]: {
        ...localSettings[section],
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
      setLogoPreview(event.target.result);
      handleChange('company', 'logo', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      await saveSettingsMutation.mutateAsync(localSettings);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  return (
    <PageLayout title="Settings">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure your business settings</p>
      </div>

      <div className="card settings-card">
        <div className="card-content">
          <Tabs
            tabs={[
              { id: 'company', label: 'Company Details' },
              { id: 'quote', label: 'Quote Settings' },
              { id: 'invoice', label: 'Invoice Settings' },
              { id: 'bank', label: 'Bank Details' },
              { id: 'cis', label: 'CIS Settings' }
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