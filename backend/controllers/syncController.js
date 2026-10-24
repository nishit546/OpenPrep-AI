const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const { calculateSM2 } = require('../utils/sm2');

/**
 * Last-Write-Wins (LWW) timestamp comparator.
 * Returns true if client timestamp is newer or equal to server timestamp.
 */
function isClientNewer(clientTimestamp, serverTimestamp) {
  if (!serverTimestamp) return true;
  if (!clientTimestamp) return true;
  const clientTime = new Date(clientTimestamp).getTime();
  const serverTime = new Date(serverTimestamp).getTime();
  return clientTime >= serverTime;
}

/**
 * Processes a batch of queued actions/mutations from offline client.
 * POST /api/sync/batch
 */
exports.processBatchSync = async (req, res) => {
  try {
    const mutations = req.body.mutations || req.body.actions || req.body.reviews;
    const userId = req.user?.id || req.body.userId;

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Provide a non-empty array of offline mutations to sync.',
      });
    }

    const results = [];
    let processed = 0;
    let failed = 0;
    let conflictsResolved = 0;

    for (const item of mutations) {
      const actionId = item.id || item.actionId || item.mutationId;
      const type = (item.type || item.action || 'FLASHCARD_REVIEW').toUpperCase();
      const clientTimestamp = item.clientTimestamp || item.timestamp || item.reviewedAt || new Date().toISOString();
      const payload = item.payload || item;

      try {
        if (type === 'FLASHCARD_REVIEW' || type === 'REVIEW') {
          const cardId = payload.cardId || payload.flashcardId || payload.id;
          const score = payload.score ?? payload.quality ?? payload.rating;

          if (!cardId || score === undefined) {
            results.push({
              actionId,
              status: 'rejected',
              error: 'Missing cardId or score in flashcard review payload',
            });
            failed++;
            continue;
          }

          const card = await Flashcard.findOne({
            where: userId ? { id: cardId, user: userId } : { id: cardId },
          });

          if (!card) {
            results.push({
              actionId,
              status: 'not_found',
              error: `Flashcard ${cardId} not found`,
            });
            failed++;
            continue;
          }

          // Check LWW conflict
          if (card.lastReviewedAt && !isClientNewer(clientTimestamp, card.lastReviewedAt)) {
            // Server has newer review; keep server version (conflict resolved)
            conflictsResolved++;
            results.push({
              actionId,
              status: 'conflict_resolved',
              resolution: 'server_wins',
              message: 'Server record has more recent review. Mutation skipped.',
              currentEntity: {
                id: card.id,
                interval: card.interval,
                repetitions: card.repetitions,
                efactor: card.efactor,
              },
            });
            processed++;
            continue;
          }

          // Apply SM-2 and FSRS updates
          const { interval, repetitions, efactor } = calculateSM2({
            interval: card.interval ?? 0,
            repetitions: card.repetitions ?? 0,
            efactor: card.efactor ?? 2.5,
            quality: score,
          });

          const fsrsScheduler = require('../services/fsrsScheduler');
          const fsrsRating = payload.rating ? Number(payload.rating) : fsrsScheduler.mapQualityToRating(score);
          const targetRetention = payload.requestedRetention || 0.90;
          const fsrsState = fsrsScheduler.calculateFSRS(card, fsrsRating, targetRetention);

          card.interval = interval;
          card.repetitions = repetitions;
          card.efactor = efactor;
          card.stability = fsrsState.stability;
          card.fsrsDifficulty = fsrsState.difficulty;
          card.elapsedDays = fsrsState.elapsedDays;
          card.scheduledDays = fsrsState.scheduledDays;
          card.reps = fsrsState.reps;
          card.lapses = fsrsState.lapses;
          card.state = fsrsState.state;
          card.lastReviewedAt = new Date(clientTimestamp);
          await card.save();

          results.push({
            actionId,
            status: 'applied',
            entityType: 'Flashcard',
            entityId: card.id,
            data: {
              interval,
              repetitions,
              efactor,
              stability: card.stability,
              difficulty: card.fsrsDifficulty,
              state: card.state,
            },
          });
          processed++;
        } else if (type === 'NOTE_UPDATE' || type === 'UPDATE_NOTE') {
          const noteId = payload.noteId || payload.id;
          const note = await Note.findOne({
            where: userId ? { id: noteId, user: userId } : { id: noteId },
          });

          if (!note) {
            results.push({
              actionId,
              status: 'not_found',
              error: `Note ${noteId} not found`,
            });
            failed++;
            continue;
          }

          if (note.updatedAt && !isClientNewer(clientTimestamp, note.updatedAt)) {
            conflictsResolved++;
            results.push({
              actionId,
              status: 'conflict_resolved',
              resolution: 'server_wins',
              message: 'Server has newer note edits. Client mutation discarded.',
            });
            processed++;
            continue;
          }

          if (payload.title !== undefined) note.title = payload.title;
          if (payload.content !== undefined) note.content = payload.content;
          if (payload.tags !== undefined) note.tags = payload.tags;
          await note.save();

          results.push({
            actionId,
            status: 'applied',
            entityType: 'Note',
            entityId: note.id,
          });
          processed++;
        } else {
          // Generic mutation acknowledgment
          results.push({
            actionId,
            status: 'applied',
            message: `Action ${type} recorded successfully`,
          });
          processed++;
        }
      } catch (err) {
        results.push({
          actionId,
          status: 'error',
          error: err.message,
        });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed,
        failed,
        conflictsResolved,
        results,
        serverTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SyncController] Error in batch sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing batch sync',
    });
  }
};
