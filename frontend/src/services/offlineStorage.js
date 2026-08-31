const DB_NAME = 'openprep-offline-db';
const DB_VERSION = 1;

/**
 * Open or upgrade the IndexedDB instance
 */
export async function getDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('decks')) {
        db.createObjectStore('decks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('quizzes')) {
        db.createObjectStore('quizzes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save item into store
 */
export async function saveLocalData(storeName, item) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get item by ID from store
 */
export async function getLocalData(storeName, id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Queue offline mutation
 */
export async function queueMutation(mutation) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    const request = store.add({ ...mutation, timestamp: Date.now() });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all queued mutations
 */
export async function getQueuedMutations() {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readonly');
    const store = tx.objectStore('mutations');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear queued mutation by ID
 */
export async function clearQueuedMutation(id) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
