import api from './api';

/**
 * SyncService - Handles data synchronization between local storage and server
 * with offline support.
 */

// Constants
const SYNC_EVENT_PREFIX = 'sync-';
const SYNC_STARTED = `${SYNC_EVENT_PREFIX}started`;
const SYNC_COMPLETED = `${SYNC_EVENT_PREFIX}completed`;
const SYNC_ERROR = `${SYNC_EVENT_PREFIX}error`;
const SYNC_NETWORK_DISCONNECTED = `${SYNC_EVENT_PREFIX}network-disconnected`;

// Store sync metadata
let syncInProgress = false;
let lastSyncTime = localStorage.getItem('axtonLastSyncTime') 
  ? parseInt(localStorage.getItem('axtonLastSyncTime')) 
  : Date.now();
let retryCount = 0;
const maxRetries = 5;
let networkStatus = navigator.onLine;

// Set up network status listeners
window.addEventListener('online', handleNetworkChange);
window.addEventListener('offline', handleNetworkChange);

/**
 * Handle network status changes
 */
function handleNetworkChange() {
  const previousStatus = networkStatus;
  networkStatus = navigator.onLine;
  
  console.log(`Network status changed: ${previousStatus ? 'online' : 'offline'} → ${networkStatus ? 'online' : 'offline'}`);
  
  // Dispatch custom event for the app to respond to
  window.dispatchEvent(new CustomEvent(
    networkStatus ? 'network-connected' : 'network-disconnected'
  ));
  
  if (networkStatus && !previousStatus) {
    console.log('Network connection restored, resuming sync');
    // Reset retry count when network is restored
    retryCount = 0;
    // Try to sync immediately when connection is restored
    if (!syncInProgress) {
      syncAll().catch(err => console.error('Sync error after network restore:', err));
    }
  } else if (!networkStatus && previousStatus) {
    console.log('Network connection lost, sync paused');
    triggerSyncEvent(SYNC_NETWORK_DISCONNECTED);
  }
}

/**
 * Trigger sync-related events
 */
function triggerSyncEvent(eventName, detail = {}) {
  console.log(`Triggering event: ${eventName}`, detail);
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Start automatic synchronization
 */
export function startAutoSync(intervalMs = 60000) {
  let syncInterval = null;
  
  if (syncInterval) {
    clearInterval(syncInterval);
    console.log('Cleared previous sync interval');
  }
  
  // First sync immediately
  if (networkStatus && !syncInProgress) {
    console.log('Starting immediate initial sync');
    syncAll().catch(err => console.error('Initial auto-sync error:', err));
  } else {
    console.log(`Skipping initial sync: networkStatus=${networkStatus}, syncInProgress=${syncInProgress}`);
  }
  
  // Then set up recurring sync
  syncInterval = setInterval(() => {
    if (networkStatus && !syncInProgress) {
      console.log('Running scheduled auto-sync');
      syncAll().catch(err => {
        console.error('Auto-sync error:', err);
        // Increment retry count
        retryCount++;
        
        if (retryCount > maxRetries) {
          console.warn(`Sync failed ${retryCount} times, pausing auto-sync`);
          triggerSyncEvent(SYNC_ERROR, { 
            error: 'Maximum retry attempts reached',
            retries: retryCount
          });
        }
      });
    } else {
      console.log(`Skipping scheduled sync: networkStatus=${networkStatus}, syncInProgress=${syncInProgress}`);
    }
  }, intervalMs);
  
  console.log(`Auto-sync started, interval: ${intervalMs}ms`);
  return syncInterval;
}

/**
 * Stop automatic synchronization
 */
export function stopAutoSync(syncInterval) {
  if (syncInterval) {
    clearInterval(syncInterval);
    console.log('Auto-sync stopped');
  }
}

/**
 * Process deleted items properly
 */
function processDeleted(localArray, serverArray) {
  const now = new Date().toISOString();
  const result = [];
  
  // Create maps for faster lookup
  const serverMap = new Map();
  serverArray.forEach(item => serverMap.set(item.id, item));
  
  const localMap = new Map();
  localArray.forEach(item => localMap.set(item.id, item));
  
  // Process local items first
  localArray.forEach(localItem => {
    const serverItem = serverMap.get(localItem.id);
    
    // If local item is deleted and exists on server
    if (localItem.deleted && serverItem) {
      // Mark server item as deleted if not already
      if (!serverItem.deleted) {
        result.push({
          ...serverItem,
          deleted: true,
          deletedAt: now,
          updatedAt: now
        });
      }
    } 
    // If local item exists and is not deleted
    else if (!localItem.deleted) {
      // Add local item (or merge with server version if timestamps allow)
      if (serverItem) {
        const localUpdated = new Date(localItem.updatedAt || 0);
        const serverUpdated = new Date(serverItem.updatedAt || 0);
        
        if (localUpdated > serverUpdated) {
          // Local item is newer
          result.push({
            ...localItem,
            updatedAt: now
          });
        } else {
          // Server item is newer or same age
          result.push(serverItem);
        }
      } else {
        // Local item doesn't exist on server
        result.push({
          ...localItem,
          updatedAt: now
        });
      }
    }
  });
  
  // Add server items that don't exist locally and aren't deleted
  serverArray.forEach(serverItem => {
    if (!serverItem.deleted) {
      const exists = localArray.some(item => item.id === serverItem.id);
      if (!exists) {
        result.push(serverItem);
      }
    }
  });
  
  return result;
}

/**
 * Sync all data between local storage and server
 */
export async function syncAll() {
  if (syncInProgress || !networkStatus) {
    console.log('Sync all not possible:', 
               syncInProgress ? 'Sync already in progress' : 'No network');
    return null;
  }
  
  syncInProgress = true;
  triggerSyncEvent(SYNC_STARTED);
  console.log('Starting complete data synchronization');
  
  try {
    // Get local data
    const localSuppliers = JSON.parse(localStorage.getItem('axtonSuppliers') || '[]');
    const localItems = JSON.parse(localStorage.getItem('axtonItems') || '[]');
    const localQuotes = JSON.parse(localStorage.getItem('axtonSavedQuotes') || '[]');
    
    console.log(`Local data: ${localSuppliers.length} suppliers, ${localItems.length} items, ${localQuotes.length} quotes`);
    
    // Get server data
    const serverSuppliers = await api.suppliers.getAll();
    const serverItems = await api.catalog.getAll();
    const serverQuotes = await api.quotes.getAll();
    
    console.log(`Server data: ${serverSuppliers.length} suppliers, ${serverItems.length} items, ${serverQuotes.length} quotes`);
    
    // Process and merge data
    const processedSuppliers = processDeleted(localSuppliers, serverSuppliers);
    const processedItems = processDeleted(localItems, serverItems);
    
    console.log(`Processed data: ${processedSuppliers.length} suppliers, ${processedItems.length} items`);
    
    // Save processed data back to server
    await api.suppliers.update(processedSuppliers);
    await api.catalog.update(processedItems);
    
    // Process quotes (handled differently as they have nested structures)
    await syncQuotes(localQuotes, serverQuotes);
    
    // Sync invoices as well
    await syncInvoices();
    
    // Always update both memory and localStorage with non-deleted items only for consistency
    const finalSuppliers = processedSuppliers.filter(s => !s.deleted);
    const finalItems = processedItems.filter(i => !i.deleted);
    
    localStorage.setItem('axtonSuppliers', JSON.stringify(finalSuppliers));
    localStorage.setItem('axtonItems', JSON.stringify(finalItems));
    
    // Reset retry count on successful sync
    retryCount = 0;
    
    // Update last sync time
    lastSyncTime = Date.now();
    localStorage.setItem('axtonLastSyncTime', lastSyncTime);
    
    // Sync settings
    const settings = await api.settings.get();
    if (Object.keys(settings).length > 0) {
      localStorage.setItem('axtonSettings', JSON.stringify(settings));
      console.log('Settings synchronized from server');
    }
    
    // Trigger sync completed event
    triggerSyncEvent(SYNC_COMPLETED, { 
      success: true,
      suppliers: finalSuppliers,
      items: finalItems,
      timestamp: lastSyncTime
    });
    
    console.log('Complete synchronization finished successfully');
    
    syncInProgress = false;
    return {
      suppliers: finalSuppliers,
      items: finalItems
    };
  } catch (error) {
    console.error('Sync error:', error);
    
    // Trigger sync error event
    triggerSyncEvent(SYNC_ERROR, { 
      error: error.message 
    });
    
    syncInProgress = false;
    return null;
  }
}

/**
 * Sync quotes between local storage and server
 */
async function syncQuotes(localQuotes, serverQuotes) {
  try {
    console.log('Starting quote synchronization');
    
    // Create maps for faster lookup
    const serverQuoteMap = new Map();
    serverQuotes.forEach(quote => serverQuoteMap.set(quote.id, quote));
    
    const localQuoteMap = new Map();
    localQuotes.forEach(quote => localQuoteMap.set(quote.id, quote));
    
    // Process local quotes to send to server if needed
    const updatedQuotes = [];
    for (const localQuote of localQuotes) {
      const serverQuote = serverQuoteMap.get(localQuote.id);
      
      // If quote doesn't exist on server or local version is newer
      if (!serverQuote || 
          (localQuote.data?.savedAt && (!serverQuote.savedAt || new Date(localQuote.data.savedAt) > new Date(serverQuote.savedAt)))) {
        console.log(`Uploading quote ${localQuote.id} to server`);
        try {
          await api.quotes.save(localQuote.data);
          updatedQuotes.push(localQuote.id);
        } catch (err) {
          console.error(`Failed to upload quote ${localQuote.id}:`, err);
        }
      }
    }
    
    if (updatedQuotes.length > 0) {
      console.log(`Updated ${updatedQuotes.length} quotes on server`);
    }
    
    // Process server quotes to save locally if needed
    const newQuotes = [];
    const updatedLocalQuotes = [...localQuotes];
    
    for (const serverQuote of serverQuotes) {
      const localQuote = localQuoteMap.get(serverQuote.id);
      
      // If quote doesn't exist locally or server version is newer
      if (!localQuote || 
          (serverQuote.savedAt && (!localQuote.data?.savedAt || new Date(serverQuote.savedAt) > new Date(localQuote.data.savedAt)))) {
        console.log(`Downloading quote ${serverQuote.id} from server`);
        
        // Format server quote to match local structure
        const formattedQuote = {
          id: serverQuote.id,
          name: serverQuote.name || `Quote ${serverQuote.id}`,
          data: {
            id: serverQuote.id,
            name: serverQuote.name,
            client: {
              name: serverQuote.clientName || '',
              company: serverQuote.clientCompany || '',
              email: serverQuote.clientEmail || '',
              phone: serverQuote.clientPhone || '',
              address: serverQuote.clientAddress || ''
            },
            date: serverQuote.date || new Date().toISOString().split('T')[0],
            validUntil: serverQuote.validUntil || '',
            paymentTerms: serverQuote.paymentTerms || '1',
            customTerms: serverQuote.customTerms || '',
            notes: serverQuote.notes || '',
            includeDrawingOption: Boolean(serverQuote.includeDrawingOption),
            exclusions: serverQuote.exclusions || [],
            selectedItems: serverQuote.selectedItems || [],
            hiddenCosts: serverQuote.hiddenCosts || [],
            globalMarkup: serverQuote.globalMarkup || 20,
            distributionMethod: serverQuote.distributionMethod || 'even',
            savedAt: serverQuote.savedAt || new Date().toISOString()
          },
          serverUpdatedAt: serverQuote.savedAt || new Date().toISOString()
        };
        
        // Update local quote list
        const existingIndex = updatedLocalQuotes.findIndex(q => q.id === serverQuote.id);
        if (existingIndex >= 0) {
          updatedLocalQuotes[existingIndex] = formattedQuote;
        } else {
          updatedLocalQuotes.push(formattedQuote);
          newQuotes.push(serverQuote.id);
        }
      }
    }
    
    if (newQuotes.length > 0) {
      console.log(`Downloaded ${newQuotes.length} quotes from server`);
    }
    
    // Filter out deleted quotes from the local storage
    const finalLocalQuotes = updatedLocalQuotes.filter(quote => {
      const serverQuote = serverQuoteMap.get(quote.id);
      return !serverQuote || !serverQuote.deleted;
    });
    
    // Save back to local storage
    localStorage.setItem('axtonSavedQuotes', JSON.stringify(finalLocalQuotes));
    console.log(`Saved ${finalLocalQuotes.length} quotes to localStorage`);
    
    return finalLocalQuotes;
  } catch (error) {
    console.error('Error syncing quotes:', error);
    throw error;
  }
}

/**
 * Sync invoices between local storage and server
 */
async function syncInvoices() {
  if (syncInProgress || !networkStatus) {
    console.log('Sync not possible:', 
                syncInProgress ? 'Sync already in progress' : 'No network');
    return false;
  }
  
  syncInProgress = true;
  console.log('Starting invoice synchronization...');
  
  try {
    // Load invoices from localStorage
    const localInvoices = JSON.parse(localStorage.getItem('axtonInvoices') || '[]');
    console.log(`Found ${localInvoices.length} local invoices`);
    
    // Get server invoices
    const serverInvoices = await api.invoices.getAll();
    console.log(`Found ${serverInvoices.length} server invoices`);
    
    // Create maps for faster lookup
    const serverInvoiceMap = new Map();
    serverInvoices.forEach(invoice => serverInvoiceMap.set(invoice.id, invoice));
    
    const localInvoiceMap = new Map();
    localInvoices.forEach(invoice => localInvoiceMap.set(invoice.id, invoice));
    
    // Process local invoices to send to server if needed
    const updatedInvoices = [];
    
    for (const localInvoice of localInvoices) {
      const serverInvoice = serverInvoiceMap.get(localInvoice.id);
      
      // If invoice doesn't exist on server or local version is newer
      if (!serverInvoice || 
          (localInvoice.updatedAt && serverInvoice.updatedAt && 
            new Date(localInvoice.updatedAt) > new Date(serverInvoice.updatedAt))) {
        console.log(`Uploading invoice ${localInvoice.id} to server`);
        try {
          await api.invoices.save(localInvoice);
          updatedInvoices.push(localInvoice.id);
        } catch (err) {
          console.error(`Failed to upload invoice ${localInvoice.id}:`, err);
        }
      }
    }
    
    if (updatedInvoices.length > 0) {
      console.log(`Updated ${updatedInvoices.length} invoices on server`);
    }
    
    // Process server invoices to save locally if needed
    const newInvoices = [];
    const mergedInvoices = [...localInvoices];
    const localIds = new Set(localInvoices.map(inv => inv.id));
    
    for (const serverInvoice of serverInvoices) {
      const localInvoice = localInvoiceMap.get(serverInvoice.id);
      
      if (!localInvoice) {
        // Server invoice doesn't exist locally, add it
        mergedInvoices.push(serverInvoice);
        newInvoices.push(serverInvoice.id);
      } else if (serverInvoice.updatedAt && localInvoice.updatedAt && 
                 new Date(serverInvoice.updatedAt) > new Date(localInvoice.updatedAt)) {
        // Server invoice is newer, update local
        const index = mergedInvoices.findIndex(inv => inv.id === serverInvoice.id);
        if (index !== -1) {
          mergedInvoices[index] = serverInvoice;
          newInvoices.push(serverInvoice.id);
        }
      }
    }
    
    if (newInvoices.length > 0) {
      console.log(`Downloaded ${newInvoices.length} invoices from server`);
    }
    
    // Save merged invoices back to localStorage
    localStorage.setItem('axtonInvoices', JSON.stringify(mergedInvoices));
    console.log(`Saved ${mergedInvoices.length} invoices to localStorage`);
    
    syncInProgress = false;
    return mergedInvoices;
  } catch (error) {
    syncInProgress = false;
    console.error('Error syncing invoices:', error);
    throw error;
  }
}

/**
 * Hook to check if network is online
 */
export function isOnline() {
  return networkStatus;
}

/**
 * Hook to check if sync is in progress
 */
export function isSyncing() {
  return syncInProgress;
}

/**
 * Get last sync time
 */
export function getLastSyncTime() {
  return lastSyncTime;
}

/**
 * Create a custom Hook to handle synchronization in React components
 */
export function useSyncStatus() {
  return {
    isOnline: networkStatus,
    isSyncing: syncInProgress,
    lastSyncTime,
    syncAll,
    startAutoSync,
    stopAutoSync
  };
}

export default {
  syncAll,
  syncInvoices,
  startAutoSync,
  stopAutoSync,
  isOnline,
  isSyncing,
  getLastSyncTime,
  useSyncStatus
};