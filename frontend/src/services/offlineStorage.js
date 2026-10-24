import {
  getDb,
  put,
  get,
  getAll,
  remove,
  queueOutboxMutation,
  getPendingMutations,
  removeOutboxMutation,
  getQueuedMutations,
  clearOutbox,
  saveDecks,
  getDecks,
  saveFlashcards,
  getFlashcards,
  saveSyllabus,
  getSyllabus,
  enqueueCardGrading,
} from './offlineStorageService';

export {
  getDb,
  put,
  get,
  getAll,
  remove,
  queueOutboxMutation,
  getPendingMutations,
  removeOutboxMutation,
  getQueuedMutations,
  clearOutbox,
  saveDecks,
  getDecks,
  saveFlashcards,
  getFlashcards,
  saveSyllabus,
  getSyllabus,
  enqueueCardGrading,
};

/**
 * Save item into store (legacy bridge)
 */
export async function saveLocalData(storeName, item) {
  return put(storeName, item);
}

/**
 * Get item by ID from store (legacy bridge)
 */
export async function getLocalData(storeName, id) {
  return get(storeName, id);
}

/**
 * Queue offline mutation (legacy bridge)
 */
export async function queueMutation(mutation) {
  return queueOutboxMutation(mutation);
}

/**
 * Clear queued mutation by ID (legacy bridge)
 */
export async function clearQueuedMutation(id) {
  return removeOutboxMutation(id);
}

