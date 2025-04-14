import * as storageService from './storageService'; // Import the new storage service
import { useAuth } from '../context/AuthContext'; // Need context potentially for GAPI status?

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

// --- Google Drive Configuration ---
const DRIVE_FILE_NAME = 'artemis_data.json';
const APP_DATA_STORES = ['quotes', 'items', 'suppliers', 'settings', 'invoices', 'contacts'];

// Store sync metadata
let syncInProgress = false;
let lastSyncTime = null; // Will be loaded from storage or Drive later
let retryCount = 0;
const maxRetries = 5;
let networkStatus = navigator.onLine;

// Attempt to load lastSyncTime from storage on module load
(async () => {
  try {
    const storedSetting = await storageService.getItem('settings', 'lastSyncTime');
    if (storedSetting && typeof storedSetting.value === 'number') {
      lastSyncTime = storedSetting.value;
      console.log(`[Sync] Initialized lastSyncTime from settings: ${new Date(lastSyncTime).toISOString()}`);
    } else {
        console.log('[Sync] No valid lastSyncTime found in settings.');
    }
  } catch (error) {
    console.error('[Sync] Error loading initial lastSyncTime from settings:', error);
  }
})();

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
      console.log('[Sync] Network restored. Triggering syncAll.');
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
    // Note: Initial sync is now triggered from App component after GAPI is ready.
  } else {
    console.log(`Skipping immediate sync in startAutoSync: networkStatus=${networkStatus}, syncInProgress=${syncInProgress}`);
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
      console.log('[Sync] Running scheduled auto-sync.');
      syncAll().catch(err => {
        console.error('[Sync] Auto-sync error:', err);
        retryCount++;
        if (retryCount > maxRetries) {
          console.warn(`[Sync] Auto-sync failed ${retryCount} times, pausing auto-sync for this session.`);
          // Consider stopping the interval completely or just logging
          triggerSyncEvent(SYNC_ERROR, {
            error: 'Maximum retry attempts reached',
            retries: retryCount
          });
          // Optionally stop the interval: clearInterval(syncInterval); syncInterval = null;
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

// --- Google Drive Helper Functions ---

/**
 * Finds the application's data file in Google Drive or creates it if not found.
 * Returns the file ID.
 * @returns {Promise<string | null>} The file ID or null if an error occurs.
 */
async function findOrCreateDriveFile() {
  if (!window.gapi?.client?.drive) {
    console.error('[Sync] GAPI Drive client not loaded.');
    throw new Error('Google Drive API not ready.');
  }

  console.log(`[Sync] Searching for Drive file: ${DRIVE_FILE_NAME}`);
  try {
    // Search for the file by name in the user's root folder
    const response = await window.gapi.client.drive.files.list({
      q: `name='${DRIVE_FILE_NAME}' and trashed=false`,
      // Use 'root' or specify another parent folder ID if needed
      // Use 'appDataFolder' space if using drive.appdata scope
      spaces: 'drive', 
      fields: 'files(id, name, modifiedTime)',
    });

    if (response.result.files && response.result.files.length > 0) {
      const file = response.result.files[0];
      console.log(`[Sync] Found Drive file ID: ${file.id}, Modified: ${file.modifiedTime}`);
      return file.id;
    } else {
      console.log(`[Sync] Drive file not found. Creating new file: ${DRIVE_FILE_NAME}`);
      // Create the file if it doesn't exist
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: DRIVE_FILE_NAME,
          // Add mimeType if needed, defaults likely okay for JSON
          // mimeType: 'application/json',
          // parents: ['root'] // Specify parent folder if not root
        },
        fields: 'id',
      });
      console.log(`[Sync] Created new Drive file ID: ${createResponse.result.id}`);
      return createResponse.result.id;
    }
  } catch (error) {
    console.error('[Sync] Error finding or creating Drive file:', error);
    throw new Error(`Failed to access Google Drive file: ${error.result?.error?.message || error.message}`);
  }
}

/**
 * Downloads and parses the JSON content of the Drive file.
 * @param {string} fileId The ID of the file in Google Drive.
 * @returns {Promise<object | null>} Parsed JSON data or null if file is empty/invalid.
 */
async function downloadDriveFileContent(fileId) {
  if (!fileId) return null;
  console.log(`[Sync] Downloading content for Drive file ID: ${fileId}`);
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    // If the file is empty or content is not JSON, response.body might be empty string or invalid
    if (response.body && response.body.length > 0) {
        try {
            const jsonData = JSON.parse(response.body);
            console.log('[Sync] Successfully downloaded and parsed Drive file content.', jsonData);
            return jsonData;
        } catch (parseError) {
            console.error('[Sync] Error parsing JSON from Drive file:', parseError, 'Content:', response.body);
            throw new Error('Drive file contains invalid JSON data.');
        }
    } else {
        console.log('[Sync] Drive file is empty or content is missing.');
        return null; // Return null for empty files
    }
  } catch (error) {
    // Handle 404 Not Found specifically - might mean the file was deleted externally
    if (error.status === 404) {
        console.warn(`[Sync] Drive file ID ${fileId} not found (404). Maybe deleted externally?`);
        return null; // Treat as empty/non-existent
    }
    console.error('[Sync] Error downloading Drive file content:', error);
    throw new Error(`Failed to download Google Drive file content: ${error.result?.error?.message || error.message}`);
  }
}

/**
 * Bundles local IndexedDB data into a JSON object.
 * @returns {Promise<object>}
 */
async function bundleLocalData() {
  console.log('[Sync] Bundling local data from IndexedDB.');
  const localDataBundle = {
    lastUpdated: new Date().toISOString(), // Timestamp for comparison
    data: {}
  };
  try {
    for (const storeName of APP_DATA_STORES) {
      localDataBundle.data[storeName] = await storageService.getAllItems(storeName);
    }
    console.log('[Sync] Local data bundled successfully.');
    return localDataBundle;
  } catch (error) {
    console.error('[Sync] Error bundling local data:', error);
    throw new Error('Failed to read local application data.');
  }
}

/**
 * Uploads the bundled JSON data to the specified Drive file.
 * @param {string} fileId The ID of the file in Google Drive.
 * @param {object} dataBundle The bundled data object to upload.
 * @returns {Promise<void>}
 */
async function uploadToDrive(fileId, dataBundle) {
  if (!fileId || !dataBundle) return;
  console.log(`[Sync] Uploading data to Drive file ID: ${fileId}`);
  try {
    const jsonData = JSON.stringify(dataBundle);
    await window.gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH', // Use PATCH to update content
        params: { uploadType: 'media' },
        body: jsonData,
    });
    console.log('[Sync] Successfully uploaded data to Drive.');
  } catch (error) {
    console.error('[Sync] Error uploading data to Drive:', error);
    throw new Error(`Failed to upload data to Google Drive: ${error.result?.error?.message || error.message}`);
  }
}

/**
 * Replaces local IndexedDB data with data from the Drive bundle.
 * @param {object} driveDataBundle The data bundle downloaded from Drive.
 * @returns {Promise<void>}
 */
async function applyDriveDataLocally(driveDataBundle) {
  if (!driveDataBundle || !driveDataBundle.data) {
      console.warn('[Sync] No valid data received from Drive to apply locally.');
      return;
  }
  console.log('[Sync] Applying Drive data to local IndexedDB.');
  try {
    // Clear existing local data and replace with Drive data
    for (const storeName of APP_DATA_STORES) {
      console.log(`[Sync] Clearing store: ${storeName}`);
      await storageService.clearStore(storeName);
      const storeData = driveDataBundle.data[storeName];
      if (storeData && Array.isArray(storeData)) {
        console.log(`[Sync] Adding ${storeData.length} items to store: ${storeName}`);
        // Add items one by one or potentially use addBulk if storageService supports it
        for (const item of storeData) {
          // Ensure item has an ID if required by store keyPath
          if (typeof item.id === 'undefined') {
             console.warn(`[Sync] Item in store ${storeName} from Drive is missing ID:`, item);
             // Skip or assign ID depending on app logic
             continue; 
          }
          await storageService.putItem(storeName, item);
        }
      }
    }
    console.log('[Sync] Finished applying Drive data locally.');
  } catch (error) {
    console.error('[Sync] Error applying Drive data locally:', error);
    throw new Error('Failed to update local data from Google Drive.');
  }
}

/**
 * Sync All data with Google Drive.
 * Assumes gapi client is loaded and user is authenticated.
 */
export async function syncAll() {
  // Check if GAPI is ready (this check might be better placed *before* calling syncAll)
  if (!window.gapi?.client?.drive) {
    console.warn('[Sync] Attempted syncAll, but GAPI Drive client is not ready.');
    triggerSyncEvent(SYNC_ERROR, { error: 'Google Drive API not ready.' });
    return null;
  }

  if (syncInProgress || !networkStatus) {
    console.log('[Sync] Sync all not possible:', 
               syncInProgress ? 'Sync already in progress' : 'No network');
    return null;
  }
  
  syncInProgress = true;
  triggerSyncEvent(SYNC_STARTED);
  console.log('[Sync] Starting Google Drive synchronization');

  try {
    // 1. Find or Create the Drive file
    const fileId = await findOrCreateDriveFile();
    if (!fileId) throw new Error('Could not get Drive file ID.');

    // 2. Download Drive file content
    const driveDataBundle = await downloadDriveFileContent(fileId);
    const driveTimestamp = driveDataBundle ? new Date(driveDataBundle.lastUpdated || 0) : new Date(0);
    console.log(`[Sync] Drive data timestamp: ${driveTimestamp.toISOString()}`);

    // 3. Get Local Data Bundle (including its timestamp)
    const localDataBundle = await bundleLocalData();
    const localTimestamp = new Date(localDataBundle.lastUpdated);
    console.log(`[Sync] Local data timestamp: ${localTimestamp.toISOString()}`);

    // 4. Compare Timestamps & Decide Action (Last Write Wins)
    if (!driveDataBundle || localTimestamp > driveTimestamp) {
      // Local is newer (or Drive file is new/empty), Upload local to Drive
      console.log('[Sync] Local data is newer or Drive file empty. Uploading to Drive.');
      await uploadToDrive(fileId, localDataBundle);
      lastSyncTime = new Date(localDataBundle.lastUpdated).getTime(); // Use timestamp from uploaded bundle

    } else if (driveTimestamp > localTimestamp) {
      // Drive is newer, Apply Drive data locally
      console.log('[Sync] Drive data is newer. Applying locally.');
      await applyDriveDataLocally(driveDataBundle);
      lastSyncTime = driveTimestamp.getTime(); // Use timestamp from downloaded bundle

    } else {
      // Timestamps are the same (or both invalid/zero), data is considered in sync
      console.log('[Sync] Local and Drive data timestamps match. No sync action needed.');
      lastSyncTime = localTimestamp.getTime(); // Use local timestamp
    }

    // 5. Finalize Sync
    retryCount = 0;
    // Persist lastSyncTime (e.g., in IndexedDB settings)
    try {
      await storageService.putItem('settings', { id: 'lastSyncTime', value: lastSyncTime });
      console.log(`[Sync] Persisted lastSyncTime (${lastSyncTime}) to settings.`);
    } catch(settingsError) {
       console.warn('[Sync] Could not persist lastSyncTime to settings:', settingsError);
    }
    
    console.log(`[Sync] Google Drive sync completed successfully. Last sync time: ${new Date(lastSyncTime).toISOString()}`);
    triggerSyncEvent(SYNC_COMPLETED, { lastSyncTime });
    syncInProgress = false;
    return { success: true, lastSyncTime };

  } catch (error) {
    console.error('[Sync] Google Drive sync failed: ', error);
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
  // TODO: Load initial lastSyncTime from storageService async when service loads?
  // For now, it returns the in-memory value, which is null until first sync.
  // Removed TODO as initial load is now attempted above.
  return lastSyncTime;
}

/**
 * React hook to get the current sync status and last sync time.
 * This hook should be defined in its own file (e.g., src/hooks/useSyncStatus.js)
 * as service files cannot contain React hooks.
 */
// export function useSyncStatus() { ... remove the implementation ... }

// Remove default export if not needed or update it
// Leaving it commented out as the service now exports named functions.
// export default { 
//   syncAll,
//   startAutoSync,
//   stopAutoSync,
//   isOnline,
//   isSyncing,
//   getLastSyncTime
//   // useSyncStatus removed
// };