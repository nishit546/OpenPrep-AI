import Dexie from 'dexie';

// Define Mock Exam local IndexedDB database
export const db = new Dexie('MockExamDatabase');

db.version(1).stores({
  examStates: 'sessionId, elapsedSeconds, updatedAt',
});

/**
 * Persists the current state of a mock exam session into IndexedDB
 * @param {string} sessionId - The active exam session ID
 * @param {object} state - The exam state (answers, currentQuestionIndex, currentSection, elapsedSeconds, etc.)
 */
export const saveExamState = async (sessionId, state) => {
  try {
    await db.examStates.put({
      sessionId,
      state,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('[IndexedDBSync] Failed to save mock exam state to IndexedDB:', error);
  }
};

/**
 * Retrieves the persisted mock exam session state from IndexedDB
 * @param {string} sessionId - The active exam session ID
 * @returns {Promise<object|null>} The saved exam state, or null if none exists
 */
export const getExamState = async (sessionId) => {
  try {
    const record = await db.examStates.get(sessionId);
    return record ? record.state : null;
  } catch (error) {
    console.error('[IndexedDBSync] Failed to retrieve mock exam state from IndexedDB:', error);
    return null;
  }
};

/**
 * Deletes the persisted mock exam state from IndexedDB upon submission
 * @param {string} sessionId - The active exam session ID
 */
export const clearExamState = async (sessionId) => {
  try {
    await db.examStates.delete(sessionId);
  } catch (error) {
    console.error('[IndexedDBSync] Failed to clear mock exam state from IndexedDB:', error);
  }
};
