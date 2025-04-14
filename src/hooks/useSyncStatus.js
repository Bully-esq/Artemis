import { useState, useEffect } from 'react';
import { isSyncing, getLastSyncTime, isOnline } from '../services/syncService'; // Import status functions

// Constants for sync events (should match syncService.js)
const SYNC_EVENT_PREFIX = 'sync-';
const SYNC_STARTED = `${SYNC_EVENT_PREFIX}started`;
const SYNC_COMPLETED = `${SYNC_EVENT_PREFIX}completed`;
const SYNC_ERROR = `${SYNC_EVENT_PREFIX}error`;
const SYNC_NETWORK_DISCONNECTED = 'network-disconnected';
const SYNC_NETWORK_CONNECTED = 'network-connected';

/**
 * React hook to get the current sync status and last sync time.
 * Listens to custom events dispatched by syncService.
 */
export function useSyncStatus() {
  // Initialize state from the service functions directly
  const [syncing, setSyncing] = useState(isSyncing()); 
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(getLastSyncTime());
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    // Handlers for sync events
    const handleSyncStart = () => setSyncing(true);
    const handleSyncEnd = (event) => {
      setSyncing(false);
      // Update last sync time if provided in the event detail
      if (event?.detail?.lastSyncTime) {
        setLastSyncTimestamp(event.detail.lastSyncTime);
      }
    };
    const handleNetworkOnline = () => setOnline(true);
    const handleNetworkOffline = () => setOnline(false);

    // Add event listeners
    window.addEventListener(SYNC_STARTED, handleSyncStart);
    window.addEventListener(SYNC_COMPLETED, handleSyncEnd);
    window.addEventListener(SYNC_ERROR, handleSyncEnd); // Treat error as end of sync attempt
    window.addEventListener(SYNC_NETWORK_CONNECTED, handleNetworkOnline);
    window.addEventListener(SYNC_NETWORK_DISCONNECTED, handleNetworkOffline);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener(SYNC_STARTED, handleSyncStart);
      window.removeEventListener(SYNC_COMPLETED, handleSyncEnd);
      window.removeEventListener(SYNC_ERROR, handleSyncEnd);
      window.removeEventListener(SYNC_NETWORK_CONNECTED, handleNetworkOnline);
      window.removeEventListener(SYNC_NETWORK_DISCONNECTED, handleNetworkOffline);
    };
  }, []); // Run only once on mount

  return { isSyncing: syncing, lastSyncTime: lastSyncTimestamp, isOnline: online };
} 