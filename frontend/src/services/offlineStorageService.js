/**
 * @fileoverview Offline Storage Service for OpenPrep AI
 * IndexedDB storage engine for local flashcard decks, cards, syllabus metadata,
 * and outbox mutation queue for background synchronization.
 */

const DB_NAME = 'OpenPrepOfflineDB';
const DB_VERSION = 3;

let monotonicCounter = 0;

/**
 * Open or upgrade the local IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Local store for flashcard decks
      if (!db.objectStoreNames.contains('decks')) {
        db.createObjectStore('decks', { keyPath: 'id' });
      }

      // Local store for individual flashcards
      if (!db.objectStoreNames.contains('flashcards')) {
        db.createObjectStore('flashcards', { keyPath: 'id' });
      }

      // Local store for academic syllabus metadata
      if (!db.objectStoreNames.contains('syllabus')) {
        db.createObjectStore('syllabus', { keyPath: 'id' });
      }

      // Local store for user notes
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }

      // Local store for offline practice quiz results
      if (!db.objectStoreNames.contains('quizResults')) {
        db.createObjectStore('quizResults', { keyPath: 'id' });
      }

      // Primary outbox mutation queue for background sync
      if (!db.objectStoreNames.contains('outbox_mutations')) {
        db.createObjectStore('outbox_mutations', { keyPath: 'id', autoIncrement: true });
      }

      // Legacy queue alias for backward compatibility
      if (!db.objectStoreNames.contains('mutationsQueue')) {
        db.createObjectStore('mutationsQueue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Fetch all items from a given object store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetch a single item by key from an object store.
 * @param {string} storeName
 * @param {any} id
 * @returns {Promise<any|null>}
 */
async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add or update an item in an object store.
 * @param {string} storeName
 * @param {object} value
 * @returns {Promise<any>}
 */
async function put(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove an item by ID from an object store.
 * @param {string} storeName
 * @param {any} id
 * @returns {Promise<void>}
 */
async function remove(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from an object store.
 * @param {string} storeName
 * @returns {Promise<void>}
 */
async function clear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ──────────────────────────────────────────────
// High-Level Domain Storage Helpers
// ──────────────────────────────────────────────

/**
 * Persist flashcard decks into the local IndexedDB store.
 * @param {object[]} decks
 * @returns {Promise<void>}
 */
async function saveDecks(decks) {
  if (!Array.isArray(decks)) return;
  for (const deck of decks) {
    if (deck && deck.id) {
      await put('decks', deck);
    }
  }
}

/**
 * Retrieve all persisted flashcard decks.
 * @returns {Promise<object[]>}
 */
async function getDecks() {
  return getAll('decks');
}

/**
 * Persist flashcards into the local IndexedDB store.
 * @param {object[]} cards
 * @returns {Promise<void>}
 */
async function saveFlashcards(cards) {
  if (!Array.isArray(cards)) return;
  for (const card of cards) {
    if (card && card.id) {
      await put('flashcards', card);
    }
  }
}

/**
 * Retrieve flashcards, optionally filtered by deck ID.
 * @param {string} [deckId]
 * @returns {Promise<object[]>}
 */
async function getFlashcards(deckId) {
  const cards = await getAll('flashcards');
  if (!deckId) return cards;
  return cards.filter((c) => c.deckId === deckId || c.deck === deckId);
}

/**
 * Persist academic syllabus metadata.
 * @param {object|object[]} syllabus
 * @returns {Promise<void>}
 */
async function saveSyllabus(syllabus) {
  if (Array.isArray(syllabus)) {
    for (const item of syllabus) {
      if (item && item.id) await put('syllabus', item);
    }
  } else if (syllabus && syllabus.id) {
    await put('syllabus', syllabus);
  }
}

/**
 * Retrieve cached academic syllabus metadata.
 * @returns {Promise<object[]>}
 */
async function getSyllabus() {
  return getAll('syllabus');
}

// ──────────────────────────────────────────────
// Outbox Mutation Queue & Background Sync
// ──────────────────────────────────────────────

/**
 * Appends a mutation to the outbox queue with a monotonic timestamp and sequence counter.
 * @param {object} action - { type, entityType, entityId, payload, url, method }
 * @returns {Promise<object>}
 */
async function queueOutboxMutation(action) {
  monotonicCounter++;
  const mutation = {
    ...action,
    attempts: 0,
    timestamp: Date.now(),
    sequence: monotonicCounter,
    clientTimestamp: new Date().toISOString(),
  };

  const id = await put('outbox_mutations', mutation);
  const queued = { ...mutation, id };

  // Mirror to mutationsQueue for backward compatibility
  try {
    await put('mutationsQueue', queued);
  } catch (_) {}

  return queued;
}

/**
 * Enqueue a card grading review action into the local outbox_mutations queue.
 *
 * @param {string} cardId
 * @param {number} rating - 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 * @param {number} quality - 0 to 5 score
 * @param {number} [requestedRetention=0.90]
 * @returns {Promise<object>}
 */
async function enqueueCardGrading(cardId, rating, quality, requestedRetention = 0.90) {
  return queueOutboxMutation({
    type: 'FLASHCARD_REVIEW',
    action: 'FLASHCARD_REVIEW',
    entityType: 'Flashcard',
    entityId: cardId,
    url: `/api/flashcards/${cardId}/review`,
    method: 'PUT',
    payload: {
      cardId,
      rating,
      quality,
      score: quality,
      requestedRetention,
      clientTimestamp: new Date().toISOString(),
    },
  });
}

/**
 * Retrieve all pending mutations in the outbox ordered by sequence/timestamp.
 * @returns {Promise<object[]>}
 */
async function getPendingMutations() {
  const list = await getAll('outbox_mutations');
  return list.sort((a, b) => (a.sequence || a.timestamp) - (b.sequence || b.timestamp));
}

/**
 * Remove a processed mutation from the outbox queue.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
async function removeOutboxMutation(id) {
  await remove('outbox_mutations', id);
  try {
    await remove('mutationsQueue', id);
  } catch (_) {}
}

/**
 * Clear all pending outbox mutations.
 * @returns {Promise<void>}
 */
async function clearOutbox() {
  await clear('outbox_mutations');
  try {
    await clear('mutationsQueue');
  } catch (_) {}
}

export {
  openDB,
  getAll,
  getById,
  put,
  remove,
  clear,
  saveDecks,
  getDecks,
  saveFlashcards,
  getFlashcards,
  saveSyllabus,
  getSyllabus,
  queueOutboxMutation,
  enqueueCardGrading,
  getPendingMutations,
  removeOutboxMutation,
  clearOutbox,
  getPendingMutations as getQueuedMutations,
};
