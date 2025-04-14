import * as storageService from './storageService'; // Import the new storage service

/**
 * SyncService - Handles data synchronization using local IndexedDB and Google Drive.
 * (Formerly synced with a backend server)
 */

// Constants
const SYNC_EVENT_PREFIX = 'sync-';
const SYNC_STARTED = `${SYNC_EVENT_PREFIX}started`;
const SYNC_COMPLETED = `${SYNC_EVENT_PREFIX}completed`;
const SYNC_ERROR = `${SYNC_EVENT_PREFIX}error`;
const SYNC_NETWORK_DISCONNECTED = `${SYNC_EVENT_PREFIX}network-disconnected`;

// Store sync metadata
let syncInProgress = false;
let lastSyncTime = null; // Will be loaded from storage or Drive later
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
      // syncAll().catch(err => console.error('Sync error after network restore:', err)); // TODO: Re-enable with Drive Sync
      console.log('[Sync] TODO: Trigger Drive sync after network restore.');
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
  
  // Initialize lastSyncTime from storage (example)
  // storageService.getItem('settings', 'lastSyncTime').then(time => {
  //   if (time) lastSyncTime = time;
  //   console.log('Initialized lastSyncTime:', lastSyncTime);
  // });

  if (syncInterval) {
    clearInterval(syncInterval);
    console.log('Cleared previous sync interval');
  }
  
  // First sync immediately
  if (networkStatus && !syncInProgress) {
    console.log('Starting immediate initial sync (placeholder)');
    // syncAll().catch(err => console.error('Initial auto-sync error:', err)); // TODO: Re-enable with Drive Sync
  } else {
    console.log(`Skipping initial sync: networkStatus=${networkStatus}, syncInProgress=${syncInProgress}`);
  }
  
  // Then set up recurring sync
  syncInterval = setInterval(() => {
    if (networkStatus && !syncInProgress) {
      console.log('Running scheduled auto-sync (placeholder)');
      // syncAll().catch(err => { // TODO: Re-enable with Drive Sync
      //   console.error('Auto-sync error:', err);
      //   // Increment retry count
      //   retryCount++;
      //   
      //   if (retryCount > maxRetries) {
      //     console.warn(`Sync failed ${retryCount} times, pausing auto-sync`);
      //     triggerSyncEvent(SYNC_ERROR, { 
      //       error: 'Maximum retry attempts reached',
      //       retries: retryCount
      //     });
      //   }
      // });
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
 * Placeholder for Sync All data with Google Drive.
 * This function needs to be implemented with Google Drive API logic.
 */
export async function syncAll() {
  if (syncInProgress || !networkStatus) {
    console.log('[Sync] Sync all not possible:', 
               syncInProgress ? 'Sync already in progress' : 'No network');
    return null;
  }
  
  syncInProgress = true;
  triggerSyncEvent(SYNC_STARTED);
  console.log('[Sync] Starting Google Drive synchronization (Placeholder)');

  try {
    // TODO: Implement Google Drive Sync Logic
    // 1. Authenticate/Get Token
    // 2. Check Drive for app data file
    // 3. Download Drive file content
    // 4. Get local data from storageService (IndexedDB)
    // 5. Compare local and Drive data (e.g., using timestamps or version numbers)
    // 6. If Drive is newer: Update IndexedDB from Drive data
    // 7. If Local is newer: Upload IndexedDB data to Drive file
    // 8. Handle conflicts (e.g., last write wins, merge logic)
    // 9. Update local data in IndexedDB if needed (e.g., after conflict resolution)

    console.log('[Sync] Placeholder: Simulating sync process...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate async work
    
    // On successful sync:
    lastSyncTime = Date.now();
    retryCount = 0;
    // Persist lastSyncTime (e.g., in IndexedDB settings)
    // await storageService.putItem('settings', { id: 'lastSyncTime', value: lastSyncTime });
    console.log(`[Sync] Placeholder: Sync completed successfully. Last sync time: ${new Date(lastSyncTime).toISOString()}`);
    triggerSyncEvent(SYNC_COMPLETED, { lastSyncTime });
    syncInProgress = false;
    return { success: true, lastSyncTime };

  } catch (error) {
    console.error('[Sync] Google Drive sync failed (Placeholder): ', error);
    retryCount++;
    triggerSyncEvent(SYNC_ERROR, { error: error.message || 'Unknown sync error', retries: retryCount });
    syncInProgress = false;
    // Consider specific error handling, e.g., re-authentication for 401 errors
    throw error; // Re-throw the error to be handled by the caller if necessary
  } finally {
    syncInProgress = false; // Ensure syncInProgress is always reset
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
  // Return the in-memory value. Needs to be loaded initially.
  return lastSyncTime;
}

/**
 * Create a custom Hook to handle synchronization in React components
 */
export function useSyncStatus() {
  const [isSyncing, setIsSyncing] = useState(syncInProgress);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(lastSyncTime);

  useEffect(() => {
    // ... existing code ...

    return () => {
      window.removeEventListener(SYNC_STARTED, handleSyncStart);
      window.removeEventListener(SYNC_COMPLETED, handleSyncEnd);
      window.removeEventListener(SYNC_ERROR, handleSyncEnd); // Also stop on error
    };
  }, []);

  return { isSyncing, lastSyncTime: lastSyncTimestamp, isOnline: networkStatus };
}

export default {
  syncAll,
  startAutoSync,
  stopAutoSync,
  isOnline,
  isSyncing,
  getLastSyncTime,
  useSyncStatus
};