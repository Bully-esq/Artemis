import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from 'react-query';
import PageLayout from '../components/common/PageLayout';
import Tabs from '../components/common/Tabs';
import FormField from '../components/common/FormField';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { useAppContext } from '../context/AppContext';
import api from '../services/api';
import { deepMerge } from '../utils/deepMerge';
import CisDownloader from '../components/cis/CisDownloader';

// Helper function to apply theme attribute for preview
const applyThemePreview = (preference) => {
  let themeToApply = preference;
  if (preference === 'system') {
    themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', themeToApply);
  console.log(`Settings Preview: Applied data-theme='${themeToApply}' for preference '${preference}'`);
};

const Settings = () => {
  const { settings, updateSettings, addNotification } = useAppContext();
  console.log("Settings from context:", settings);
  const [activeTab, setActiveTab] = useState('general');
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
      
      // Apply theme preview immediately if changing the theme setting
      if (section === 'general' && field === 'theme') {
        applyThemePreview(value);
      }
      
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
      await saveSettingsMutation.mutateAsync(localSettings);
    } catch (err) {
      console.error('Error initiating settings save:', err);
    }
  };

  // Prepare mutation for saving settings 
  const saveSettingsMutation = useMutation(
    (newSettings) => {
      console.log("Saving settings:", newSettings);
      // Parse number values before saving
      const processedSettings = {
        ...newSettings,
        general: newSettings.general ? { // Include general settings
          ...newSettings.general
        } : { theme: 'system' }, // Default general structure if missing
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
        // Ensure CIS enabled is saved as boolean
        cis: newSettings.cis ? {
          ...newSettings.cis,
          enabled: Boolean(newSettings.cis.enabled),
          companyName: newSettings.cis.companyName || '',
          utr: newSettings.cis.utr || '',
          niNumber: newSettings.cis.niNumber || '',
        } : { enabled: false, companyName: '', utr: '', niNumber: ''}, // Default CIS structure
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

  // --- Auto-save CIS enabled state --- 
  useEffect(() => {
    // Only run if:
    // 1. Initialization is complete (isInitialized is true)
    // 2. localSettings is not null
    // 3. We are not currently in the middle of a save operation triggered by this effect
    if (isInitialized && localSettings && !saveSettingsMutation.isLoading) {
      // We need a way to know if this effect is running due to the initial load vs. a user toggle.
      // Using a ref to track if it's the first run after initialization for this specific setting.
      const isInitialCisLoad = initialCisStateRef.current === undefined;
      if (initialCisStateRef.current !== localSettings.cis?.enabled) {
        // Update the ref to the current state
        initialCisStateRef.current = localSettings.cis?.enabled;
        
        // Only save if it's NOT the initial load setting the value
        if (!isInitialCisLoad) {
            console.log('Auto-saving CIS enabled state:', localSettings.cis?.enabled);
            handleSaveSettings(); // Reuse the existing save handler
        }
      }
    }
  }, [localSettings?.cis?.enabled, isInitialized, saveSettingsMutation.isLoading]); // Dependencies
  
  // Ref to track the initial state of cis.enabled after load
  const initialCisStateRef = useRef(undefined);
  // --- End Auto-save --- 

  // Load settings only once when component mounts and settings are available
  useEffect(() => {
    // Only initialize if settings are loaded and we haven't initialized yet
    if (settings && !isInitialized) {
      // Define the default structure, including nested objects
      const defaultStructure = {
        general: { theme: 'system' }, // Add general section default
        company: { name: '', contactName: '', email: '', phone: '', website: '', address: '', logo: null },
        quote: { defaultMarkup: 0, prefix: 'Q-', validityPeriod: 30, defaultTerms: '1' },
        invoice: { prefix: 'INV-', defaultPaymentTerms: 30, notesTemplate: '', footer: '' },
        bank: { name: '', accountName: '', accountNumber: '', sortCode: '', iban: '', bic: '' },
        cis: { enabled: false, companyName: '', utr: '', niNumber: '' }, // Add enabled flag
        vat: { enabled: false, rate: 20, number: '' },
      };

      // Deep merge the loaded settings onto the default structure
      const initialSettings = deepMerge(defaultStructure, settings);

      setLocalSettings(initialSettings);
      setLogoPreview(initialSettings.company?.logo || null);
      // Set the initial state ref for CIS auto-save
      initialCisStateRef.current = initialSettings.cis?.enabled;
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

  // Effect to revert theme preview on unmount if changes weren't saved
  useEffect(() => {
    // This function runs when the component unmounts
    return () => {
      // Re-apply the theme based on the *saved* settings from the context
      const savedPreference = settings?.general?.theme || 'system';
      applyThemePreview(savedPreference); // Use the same helper to apply the saved theme
      console.log('Settings Unmount: Reverted theme to saved preference:', savedPreference);
    };
  }, [settings]); // Depend on settings from context

  // Show loading indicator if still loading OR if localSettings is null
  if (isLoading || localSettings === null) {
    return <Loading fullScreen message="Loading settings..." />;
  }

  // Log the theme value being used for this render
  console.log("Rendering Settings component with theme:", localSettings?.general?.theme);

  return (
    <PageLayout title="Settings" subtitle="Configure your business and application settings">
      <div className="flex justify-end mb-6">
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          isLoading={saveSettingsMutation.isLoading}
          disabled={saveSettingsMutation.isLoading}
        >
          {saveSettingsMutation.isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="bg-white dark:bg-card-background shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Tabs
            tabs={[
              { id: 'general', label: 'General' },
              { id: 'company', label: 'Company' },
              { id: 'quote', label: 'Quotes' },
              { id: 'invoice', label: 'Invoices' },
              { id: 'bank', label: 'Bank' },
              { id: 'cis', label: 'CIS' },
              { id: 'vat', label: 'VAT' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <div className="p-4 sm:p-6 md:p-8 dark:bg-card-background">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">General Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    label="Theme Preference"
                    id="theme-preference"
                    type="select"
                    value={localSettings?.general?.theme || 'system'}
                    onChange={(e) => handleChange('general', 'theme', e.target.value)}
                 >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                 </FormField>
              </div>
              <p className="text-sm text-gray-500">
                Select your preferred theme or use the system default. Changes will apply immediately for preview.
              </p>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Company Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Company Name"
                  id="company-name"
                  value={localSettings?.company?.name || ''}
                  onChange={(e) => handleChange('company', 'name', e.target.value)}
                  placeholder="Your Company Ltd"
                />
                <FormField
                  label="Contact Name"
                  id="contact-name"
                  value={localSettings?.company?.contactName || ''}
                  onChange={(e) => handleChange('company', 'contactName', e.target.value)}
                  placeholder="John Doe"
                />
                <FormField
                  label="Email Address"
                  id="company-email"
                  type="email"
                  value={localSettings?.company?.email || ''}
                  onChange={(e) => handleChange('company', 'email', e.target.value)}
                  placeholder="contact@yourcompany.com"
                />
                <FormField
                  label="Phone Number"
                  id="company-phone"
                  type="tel"
                  value={localSettings?.company?.phone || ''}
                  onChange={(e) => handleChange('company', 'phone', e.target.value)}
                  placeholder="01234 567890"
                />
                <FormField
                  label="Website"
                  id="company-website"
                  type="url"
                  value={localSettings?.company?.website || ''}
                  onChange={(e) => handleChange('company', 'website', e.target.value)}
                  placeholder="https://yourcompany.com"
                />
                <FormField
                  label="Company Address"
                  id="company-address"
                  type="textarea"
                  rows={3}
                  value={localSettings?.company?.address || ''}
                  onChange={(e) => handleChange('company', 'address', e.target.value)}
                  placeholder="123 Business Street, City, Postcode"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                   <div className="flex-shrink-0 h-16 w-32 bg-gray-100 rounded-md flex items-center justify-center border border-gray-300 overflow-hidden">
                     {logoPreview ? (
                       <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain" />
                     ) : (
                       <span className="text-xs text-gray-500 px-2 text-center">No Logo Uploaded</span>
                     )}
                   </div>
                  <div className="flex flex-col space-y-2">
                     <input
                       type="file"
                       ref={fileInputRef}
                       onChange={handleLogoUpload}
                       accept="image/*"
                       className="hidden"
                       id="logo-upload-input"
                     />
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => fileInputRef.current?.click()}
                     >
                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                     </Button>
                    {logoPreview && (
                      <Button
                        variant="danger-outline"
                        size="sm"
                        onClick={() => {
                          setLogoPreview(null);
                          handleChange('company', 'logo', null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Upload a PNG, JPG, or GIF (Max 2MB recommended).</p>
              </div>
            </div>
          )}

          {activeTab === 'quote' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quote Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Default Markup (%)"
                  id="quote-markup"
                  type="number"
                  value={localSettings?.quote?.defaultMarkup || ''}
                  onChange={(e) => handleChange('quote', 'defaultMarkup', e.target.value)}
                  placeholder="e.g., 15"
                  min="0"
                  step="0.01"
                />
                <FormField
                  label="Quote Number Prefix"
                  id="quote-prefix"
                  value={localSettings?.quote?.prefix || ''}
                  onChange={(e) => handleChange('quote', 'prefix', e.target.value)}
                  placeholder="e.g., Q-"
                />
                <FormField
                  label="Quote Validity Period (Days)"
                  id="quote-validity"
                  type="number"
                  value={localSettings?.quote?.validityPeriod || ''}
                  onChange={(e) => handleChange('quote', 'validityPeriod', e.target.value)}
                  placeholder="e.g., 30"
                  min="1"
                />
                <FormField
                  label="Default Terms & Conditions Template"
                  id="quote-terms"
                  type="textarea"
                  rows={5}
                  value={localSettings?.quote?.defaultTerms || ''}
                  onChange={(e) => handleChange('quote', 'defaultTerms', e.target.value)}
                  placeholder="Enter your standard quote terms here..."
                  className="md:col-span-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Invoice Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Invoice Number Prefix"
                  id="invoice-prefix"
                  value={localSettings?.invoice?.prefix || ''}
                  onChange={(e) => handleChange('invoice', 'prefix', e.target.value)}
                  placeholder="e.g., INV-"
                />
                <FormField
                  label="Default Payment Terms (Days)"
                  id="invoice-payment-terms"
                  type="number"
                  value={localSettings?.invoice?.defaultPaymentTerms || ''}
                  onChange={(e) => handleChange('invoice', 'defaultPaymentTerms', e.target.value)}
                  placeholder="e.g., 14"
                  min="0"
                />
                 <FormField
                   label="Default Invoice Notes"
                   id="invoice-notes"
                   type="textarea"
                   rows={4}
                   value={localSettings?.invoice?.notesTemplate || ''}
                   onChange={(e) => handleChange('invoice', 'notesTemplate', e.target.value)}
                   placeholder="e.g., Thank you for your business. Payment is due within X days."
                   className="md:col-span-2"
                 />
                <FormField
                  label="Default Invoice Footer"
                  id="invoice-footer"
                  type="textarea"
                  rows={3}
                  value={localSettings?.invoice?.footer || ''}
                  onChange={(e) => handleChange('invoice', 'footer', e.target.value)}
                  placeholder="e.g., Company Reg No: 123456 | VAT No: GB123456789"
                  className="md:col-span-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bank Details (for Invoices)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Bank Name"
                  id="bank-name"
                  value={localSettings?.bank?.name || ''}
                  onChange={(e) => handleChange('bank', 'name', e.target.value)}
                  placeholder="e.g., Starling Bank"
                />
                <FormField
                  label="Account Name"
                  id="bank-account-name"
                  value={localSettings?.bank?.accountName || ''}
                  onChange={(e) => handleChange('bank', 'accountName', e.target.value)}
                  placeholder="Your Company Ltd"
                />
                <FormField
                  label="Account Number"
                  id="bank-account-number"
                  value={localSettings?.bank?.accountNumber || ''}
                  onChange={(e) => handleChange('bank', 'accountNumber', e.target.value)}
                  placeholder="12345678"
                />
                <FormField
                  label="Sort Code"
                  id="bank-sort-code"
                  value={localSettings?.bank?.sortCode || ''}
                  onChange={(e) => handleChange('bank', 'sortCode', e.target.value)}
                  placeholder="12-34-56"
                />
                 <FormField
                   label="IBAN"
                   id="bank-iban"
                   value={localSettings?.bank?.iban || ''}
                   onChange={(e) => handleChange('bank', 'iban', e.target.value)}
                   placeholder="GB00 ABCD 1234 5678 9012 34"
                   className="md:col-span-2"
                 />
                 <FormField
                   label="BIC / Swift"
                   id="bank-bic"
                   value={localSettings?.bank?.bic || ''}
                   onChange={(e) => handleChange('bank', 'bic', e.target.value)}
                   placeholder="ABCDGB2L"
                 />
              </div>
            </div>
          )}

          {activeTab === 'cis' && (
             <div className="space-y-6">
               <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">CIS Settings (Construction Industry Scheme)</h2>

               <div className="flex items-center space-x-0 md:space-x-2 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                  <ToggleSwitch
                     id="cis-enabled"
                     checked={localSettings?.cis?.enabled || false}
                     onChange={(checked) => handleChange('cis', 'enabled', checked)}
                  />
                  <label htmlFor="cis-enabled" className="text-sm font-medium text-gray-900 dark:text-blue-100 cursor-pointer whitespace-nowrap">
                    Enable CIS Deductions
                  </label>
                  {saveSettingsMutation.isLoading && localSettings?.cis?.enabled !== settings?.cis?.enabled && (
                    <span className="text-xs text-gray-500 italic ml-2">Saving...</span>
                  )}
               </div>

               {localSettings?.cis?.enabled && (
                 <>
                   <p className="text-sm text-gray-600">
                     When enabled, CIS deductions will be calculated and displayed on relevant invoices.
                     Please ensure your company details are accurate.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                     <FormField
                       label="Company Name (for CIS)"
                       id="cis-company-name"
                       value={localSettings?.cis?.companyName || localSettings?.company?.name || ''}
                       onChange={(e) => handleChange('cis', 'companyName', e.target.value)}
                       placeholder="Enter the name registered for CIS"
                       required={localSettings?.cis?.enabled}
                     />
                     <FormField
                       label="Unique Taxpayer Reference (UTR)"
                       id="cis-utr"
                       value={localSettings?.cis?.utr || ''}
                       onChange={(e) => handleChange('cis', 'utr', e.target.value)}
                       placeholder="10-digit UTR number"
                       required={localSettings?.cis?.enabled}
                     />
                     <FormField
                       label="National Insurance (NI) Number"
                       id="cis-ni-number"
                       value={localSettings?.cis?.niNumber || ''}
                       onChange={(e) => handleChange('cis', 'niNumber', e.target.value)}
                       placeholder="e.g., QQ123456C (if applicable)"
                       required={localSettings?.cis?.enabled}
                     />
                     <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
                        <CisDownloader mode="settings" />
                     </div>
                   </div>
                 </>
               )}
             </div>
           )}

           {activeTab === 'vat' && (
             <div className="space-y-6">
               <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">VAT Settings</h2>

                <div className="flex items-center space-x-0 md:space-x-2 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
                   <ToggleSwitch
                      id="vat-enabled"
                      checked={localSettings?.vat?.enabled || false}
                      onChange={(checked) => handleChange('vat', 'enabled', checked)}
                   />
                   <label htmlFor="vat-enabled" className="text-sm font-medium text-gray-900 dark:text-yellow-100 cursor-pointer whitespace-nowrap">
                     Enable VAT Calculation
                   </label>
                 </div>

               {localSettings?.vat?.enabled && (
                 <>
                   <p className="text-sm text-gray-600">
                     When enabled, VAT will be calculated and added to quotes and invoices where applicable.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                     <FormField
                       label="Standard VAT Rate (%)"
                       id="vat-rate"
                       type="number"
                       value={localSettings?.vat?.rate || ''}
                       onChange={(e) => handleChange('vat', 'rate', e.target.value)}
                       placeholder="e.g., 20"
                       min="0"
                       step="0.01"
                       required={localSettings?.vat?.enabled}
                     />
                     <FormField
                       label="VAT Registration Number"
                       id="vat-number"
                       value={localSettings?.vat?.number || ''}
                       onChange={(e) => handleChange('vat', 'number', e.target.value)}
                       placeholder="e.g., GB123456789"
                       required={localSettings?.vat?.enabled}
                     />
                   </div>
                 </>
               )}
             </div>
           )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;