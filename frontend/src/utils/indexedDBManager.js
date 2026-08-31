/**
 * @fileoverview Robust wrapper for IndexedDB operations to support offline-first features.
 */
const DB_NAME = 'OpenPrepOfflineDB';
const DB_VERSION = 1;
// Imported by hooks/useOfflineSync.js and pages/OfflineStudyMode.jsx.
export const STORES = {
    FLASHCARDS: 'flashcards',
    SYNC_QUEUE: 'syncQueue',
};

let dbInstance = null;

/**
 * Initializes and opens the IndexedDB database.
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORES.FLASHCARDS)) {
                db.createObjectStore(STORES.FLASHCARDS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

/**
 * Adds an item to a specific object store.
 */
export const addItem = async (storeName, item) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Retrieves all items from a specific object store.
 */
export const getAllItems = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Clears all items from a specific object store.
 */
export const clearStore = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Adds an action to the background sync queue.
 */
export const queueSyncAction = async (action) => {
    const payload = {
        ...action,
        timestamp: Date.now(),
    };
    return await addItem(STORES.SYNC_QUEUE, payload);
};

/**
 * Retrieves and clears the sync queue (for atomic batch sending).
 */
export const flushSyncQueue = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);

        const getRequest = store.getAll();
        getRequest.onsuccess = async () => {
            const items = getRequest.result;
            if (items.length > 0) {
                await clearStore(STORES.SYNC_QUEUE);
            }
            resolve(items);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};
