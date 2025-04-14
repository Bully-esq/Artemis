import { openDB } from 'idb';

const DB_NAME = 'artemis-data';
const DB_VERSION = 1;

// Define your object stores here as needed
const OBJECT_STORES = ['quotes', 'items', 'suppliers', 'settings', 'invoices', 'contacts']; // Example stores

let dbPromise;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        // Create object stores if they don't exist
        OBJECT_STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            // Assuming 'id' is the key path for all stores. Adjust if needed.
            db.createObjectStore(storeName, { keyPath: 'id' }); 
            console.log(`Created object store: ${storeName}`);
          }
        });

        // Add future upgrade logic here (e.g., creating indexes)
        // Example:
        // if (oldVersion < 2) {
        //   const quoteStore = transaction.objectStore('quotes');
        //   quoteStore.createIndex('status', 'status');
        // }
      },
      blocked() {
        // Handle situation where the database upgrade is blocked
        console.error(`IndexedDB ${DB_NAME} upgrade blocked.`);
        alert('Database requires an update. Please close other tabs running this app and refresh.');
      },
      blocking() {
        // Handle situation where this connection is blocking an upgrade
        console.warn(`IndexedDB ${DB_NAME} connection is blocking an upgrade.`);
        // Consider closing the connection: db.close();
      },
      terminated() {
        // Handle situation where the browser terminated the connection
        console.error(`IndexedDB ${DB_NAME} connection terminated unexpectedly.`);
      },
    });
  }
  return dbPromise;
};

// --- Basic CRUD Operations --- 

/**
 * Get an item from a store by its key.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the item to retrieve.
 * @returns {Promise<any | undefined>}
 */
export const getItem = async (storeName, key) => {
  const db = await getDb();
  return db.get(storeName, key);
};

/**
 * Get all items from a store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<any[]>}
 */
export const getAllItems = async (storeName) => {
  const db = await getDb();
  return db.getAll(storeName);
};

/**
 * Add or update an item in a store.
 * @param {string} storeName - The name of the object store.
 * @param {any} value - The item to add or update.
 * @returns {Promise<IDBValidKey>}
 */
export const putItem = async (storeName, value) => {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const key = await store.put(value);
  await tx.done;
  return key;
};

/**
 * Delete an item from a store by its key.
 * @param {string} storeName - The name of the object store.
 * @param {IDBValidKey} key - The key of the item to delete.
 * @returns {Promise<void>}
 */
export const deleteItem = async (storeName, key) => {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.delete(key);
  await tx.done;
};

/**
 * Clear all items from a store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<void>}
 */
export const clearStore = async (storeName) => {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.clear();
  await tx.done;
};

// Example usage (can be removed later):
// async function testStorage() {
//   try {
//     await putItem('quotes', { id: 'q1', name: 'Test Quote 1', status: 'Draft' });
//     await putItem('quotes', { id: 'q2', name: 'Test Quote 2', status: 'Sent' });
//     const quote1 = await getItem('quotes', 'q1');
//     console.log('Retrieved quote 1:', quote1);
//     const allQuotes = await getAllItems('quotes');
//     console.log('All quotes:', allQuotes);
//     await deleteItem('quotes', 'q2');
//     const allQuotesAfterDelete = await getAllItems('quotes');
//     console.log('All quotes after delete:', allQuotesAfterDelete);
//     await clearStore('quotes');
//     const allQuotesAfterClear = await getAllItems('quotes');
//     console.log('All quotes after clear:', allQuotesAfterClear);
//   } catch (error) {
//     console.error('Storage test failed:', error);
//   }
// }

// testStorage(); // Uncomment to run test on load

console.log('Storage service initialized.'); 