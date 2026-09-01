/**
 * @fileoverview Lecture Audio Controller for handling audio uploads up to 100MB,
 * enqueueing BullMQ background transcription jobs, and retrieving transcripts.
 */

const { Queue } = require('bullmq');
const path = require('path');
const { Lecture } = require('../models');

const audioQueue = new Queue('lecture-audio-processing', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});

/**
 * POST /api/lectures/upload
 * Accepts lecture audio upload and initiates BullMQ async processing.
 */
const uploadLectureAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const { title, subject } = req.body;
    const userId = req.user.id;
    const filePath = req.file.path;

    // Create pending lecture entry
    const lecture = await Lecture.create({
      title: title || req.file.originalname,
      subject: subject || 'General',
      user_id: userId,
      status: 'processing',
      audio_url: `/uploads/${req.file.filename}`,
    });

    // Enqueue BullMQ processing job
    await audioQueue.add('transcribe-and-summarize', {
      lectureId: lecture.id,
      filePath: path.resolve(filePath),
    });

    return res.status(202).json({
      success: true,
      message: 'Audio upload accepted. Processing started in background.',
      lectureId: lecture.id,
      status: 'processing',
    });
  } catch (error) {
    console.error('[LectureAudioController] Upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process audio upload.' });
  }
};

/**
 * GET /api/lectures/:id/transcript
 * Returns transcript with speaker tags, chapter bookmarks, and linked flashcards.
 */
const getLectureTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lecture = await Lecture.findOne({
      where: { id, user_id: userId },
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture record not found.' });
    }

    return res.status(200).json({
      success: true,
      status: lecture.status,
      transcript: lecture.transcript || null,
      chapters: lecture.chapters || [],
      flashcards: lecture.flashcards || [],
    });
  } catch (error) {
    console.error('[LectureAudioController] Fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lecture transcript.' });
  }
};

module.exports = {
  uploadLectureAudio,
  getLectureTranscript,
};
