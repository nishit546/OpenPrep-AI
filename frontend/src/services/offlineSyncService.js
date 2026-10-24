import { db } from './db';
import API from './api';

/**
 * Reviews per request.
 *
 * The API sets `express.json({ limit: '10kb' })`. A review entry serialises to
 * roughly 100 bytes, so the whole backlog in one body crossed the limit at
 * about 103 queued reviews — a single commute's worth. The request 413'd, the
 * error was swallowed, nothing was deleted, and the next attempt sent the same
 * oversized body, so sync stayed dead forever. 50 entries is ~5 KB.
 */
const SYNC_BATCH_SIZE = 50;

/** Statuses that will never succeed on retry with the same payload. */
const PERMANENT_FAILURE_STATUSES = [400, 401, 403, 404, 413, 422];

const isOnline = () =>
  typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' || navigator.onLine;

/** Split an array into fixed-size chunks. */
const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

class OfflineSyncService {
  constructor() {
    // A single in-flight run. Two callers previously read the same unsynced
    // rows and both POSTed them, so the server applied one review twice and
    // advanced the card's SM-2 interval, repetitions and efactor twice over.
    this.inFlight = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncOfflineReviews());
    }
  }

  async queueReview(cardId, score, rating, requestedRetention) {
    try {
      const { enqueueCardGrading } = await import('./offlineStorageService');
      await enqueueCardGrading(cardId, rating || score, score, requestedRetention);
    } catch (_) {
      // Fallback gracefully
    }

    await db.offlineReviews.add({
      cardId,
      score,
      reviewedAt: new Date().toISOString(),
      synced: 0,
    });

    if (isOnline()) {
      return this.syncOfflineReviews();
    }

    return { synced: 0, failed: 0, skipped: true, reason: 'offline' };
  }

  /**
   * Push queued reviews to the server in batches.
   *
   * Overlapping calls share the in-flight run rather than starting a second
   * one, and each batch is deleted as it succeeds so a failure part-way
   * through keeps the progress already made.
   *
   * @returns {Promise<{synced: number, failed: number, reason?: string}>}
   */
  syncOfflineReviews() {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.#runSync().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  async #runSync() {
    const reviews = await db.offlineReviews.where('synced').equals(0).toArray();
    if (reviews.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    let reason;

    for (const batch of chunk(reviews, SYNC_BATCH_SIZE)) {
      try {
        const payload = batch.map((review) => ({
          cardId: review.cardId,
          score: review.score,
          reviewedAt: review.reviewedAt,
        }));

        const res = await API.post('/flashcards/batch-sync', { reviews: payload });

        if (!res?.data?.success) {
          failed += batch.length;
          reason = reason || 'server-rejected';
          break;
        }

        // Delete per batch, not once at the end: a later batch failing must
        // not make the client resend the ones that already landed.
        await db.offlineReviews.bulkDelete(batch.map((review) => review.id));
        synced += batch.length;
      } catch (err) {
        failed += batch.length;
        const status = err?.response?.status;

        if (PERMANENT_FAILURE_STATUSES.includes(status)) {
          // Retrying an identical body against a 4xx just wedges the queue.
          // Drop the batch so the rest of the backlog can drain, and say so.
          await db.offlineReviews.bulkDelete(batch.map((review) => review.id));
          reason = `dropped-${status}`;
          continue;
        }

        reason = reason || 'network';
        break;
      }
    }

    return { synced, failed, ...(reason ? { reason } : {}) };
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
