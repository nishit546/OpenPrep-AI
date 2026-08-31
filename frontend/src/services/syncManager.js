import API from './api';
import { getAll, put, remove } from './offlineStorageService';

export const SYNC_EVENT = 'offline-sync-update';

/**
 * How many times a single mutation may be replayed before it is discarded.
 *
 * Without a ceiling, one entry the server will never accept sits at the head
 * of the queue and blocks every mutation behind it — the queue only ever grows
 * and the user's later work never reaches the API either.
 */
export const MAX_ATTEMPTS = 5;

/**
 * HTTP statuses that mean "this will never succeed, stop replaying it".
 *
 * Deliberately a list rather than `status < 500`. The old check treated every
 * 4xx as terminal, which swept up 401 — the single most likely response after
 * a spell offline, because the access token expired while the queue was
 * filling — and deleted the user's work on the spot.
 */
const TERMINAL_STATUSES = new Set([400, 404, 409, 410, 422]);

/** Statuses worth another attempt: auth refresh, timeout, throttling. */
const RETRYABLE_STATUSES = new Set([401, 403, 408, 429]);

function announce() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
}

/**
 * Queues an API mutation to be replayed when connectivity returns.
 *
 * @param {Object} action - { type, url, method, payload }
 */
export async function queueOfflineMutation(action) {
  const mutation = {
    ...action,
    attempts: 0,
    timestamp: Date.now(),
  };

  await put('mutationsQueue', mutation);
  announce();

  return mutation;
}

/**
 * Replays one mutation and reports what should happen to it.
 *
 * Goes through the shared axios instance rather than `fetch`, so the request
 * picks up the bearer token, the CSRF header and the configured baseURL that
 * every other call in the app relies on. A bare `fetch` had none of those: it
 * resolved the stored path against the page origin instead of the API, and
 * arrived unauthenticated even when it did reach the server.
 *
 * @returns {Promise<'drop'|'keep'|'stop'>}
 */
async function replay(mutation) {
  const method = (mutation.method || 'POST').toLowerCase();

  try {
    await API.request({
      url: mutation.url,
      method,
      data: mutation.payload,
    });

    return 'drop';
  } catch (error) {
    const status = error?.response?.status;

    // No response at all — the connection dropped again mid-flush. Leave this
    // mutation and everything after it for the next attempt.
    if (!status) {
      console.warn(
        `[SyncManager] Connection lost while replaying ${mutation.id}; deferring the rest of the queue.`
      );
      return 'stop';
    }

    if (TERMINAL_STATUSES.has(status)) {
      console.warn(
        `[SyncManager] Discarding ${mutation.id}: the server rejected it with ${status}, which will not change on retry.`
      );
      return 'drop';
    }

    if (RETRYABLE_STATUSES.has(status) || status >= 500) {
      return 'keep';
    }

    // Anything unclassified is kept rather than deleted. Losing the user's
    // work is the worse failure, so an unexpected status errs towards a
    // duplicate replay instead of a silent drop.
    return 'keep';
  }
}

/**
 * Replays every queued mutation once connectivity is back.
 *
 * @returns {Promise<{flushed: number, retained: number, discarded: number, status: string}>}
 */
export async function flushMutationsQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, retained: 0, discarded: 0, status: 'offline' };
  }

  const queuedMutations = await getAll('mutationsQueue');
  if (queuedMutations.length === 0) {
    return { flushed: 0, retained: 0, discarded: 0, status: 'empty' };
  }

  console.log(`[SyncManager] Flushing ${queuedMutations.length} queued offline actions...`);

  let flushed = 0;
  let retained = 0;
  let discarded = 0;
  let status = 'completed';

  for (const mutation of queuedMutations) {
    const outcome = await replay(mutation);

    if (outcome === 'stop') {
      retained += 1;
      status = 'deferred';
      break;
    }

    if (outcome === 'drop') {
      await remove('mutationsQueue', mutation.id);
      flushed += 1;
      continue;
    }

    // Keep, but not forever.
    const attempts = (mutation.attempts || 0) + 1;

    if (attempts >= MAX_ATTEMPTS) {
      console.warn(
        `[SyncManager] Giving up on ${mutation.id} after ${attempts} attempts; removing it so the queue can drain.`
      );
      await remove('mutationsQueue', mutation.id);
      discarded += 1;
      continue;
    }

    await put('mutationsQueue', { ...mutation, attempts });
    retained += 1;
  }

  announce();

  return { flushed, retained, discarded, status };
}

/**
 * Replays queued mutations to backend endpoints when online connection is active.
 */
export async function replayMutations() {
  return flushMutationsQueue();
}

/**
 * Initializes sync manager events (window online/offline and SW sync trigger).
 */
export function initSyncManager(onSyncStatusChange) {
  if (typeof window === 'undefined') return;

  const handleOnline = () => {
    if (onSyncStatusChange) onSyncStatusChange({ isOnline: true });
    replayMutations().catch(err => console.error('[SyncManager] Replay error:', err));
  };

  const handleOffline = () => {
    if (onSyncStatusChange) onSyncStatusChange({ isOnline: false });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        replayMutations().catch(err => console.error('[SyncManager] SW Sync error:', err));
      }
    });
  }
}

// Flush automatically when the browser reports the connection is back.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushMutationsQueue().catch((err) =>
      console.error('[SyncManager] Auto-flush failed:', err.message)
    );
  });
}

