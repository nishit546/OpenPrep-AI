import Dexie from 'dexie';
import axios from 'axios';

// Define Notes local database
export const db = new Dexie('NotesOfflineDatabase');

db.version(1).stores({
  offlineNotes: 'id, title, subjectId, category, updatedAt',
  pendingSync: 'id, action',
});

/**
 * Saves a note locally in IndexedDB and marks it for sync
 */
export const saveNoteOffline = async (note) => {
  const noteId = note.id || crypto.randomUUID();
  const noteData = {
    ...note,
    id: noteId,
    updatedAt: Date.now(),
  };

  await db.offlineNotes.put(noteData);
  await db.pendingSync.put({ id: noteId, action: 'upsert' });

  // Try to sync immediately if online
  if (navigator.onLine) {
    await syncPendingNotes();
  }

  return noteData;
};

/**
 * Retrieves all offline-saved notes
 */
export const getOfflineNotes = async () => {
  return await db.offlineNotes.toArray();
};

/**
 * Retrieves a single note from local storage
 */
export const getOfflineNote = async (id) => {
  return await db.offlineNotes.get(id);
};

/**
 * Synchronizes pending local changes with the server
 */
export const syncPendingNotes = async () => {
  try {
    const pending = await db.pendingSync.toArray();
    if (pending.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) return; // Cannot sync if unauthenticated

    const ids = pending.map((p) => p.id);
    const notesToSync = await db.offlineNotes.where('id').anyOf(ids).toArray();

    if (notesToSync.length > 0) {
      const res = await axios.post(
        '/api/notes/sync',
        { notes: notesToSync },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data && res.data.success) {
        // Clear successfully synced items from pending queue
        await db.pendingSync.where('id').anyOf(ids).delete();
        console.log(`[notesOfflineStorage] Successfully synchronized ${notesToSync.length} notes.`);
      }
    }
  } catch (error) {
    console.error('[notesOfflineStorage] Background notes synchronization failed:', error);
  }
};

// Bind auto-sync to navigator reconnect event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[notesOfflineStorage] Device back online. Triggering notes sync.');
    syncPendingNotes();
  });
}
