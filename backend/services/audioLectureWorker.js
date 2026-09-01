/**
 * @fileoverview Audio Lecture Worker using BullMQ and ffmpeg to process
 * multi-speaker lecture recordings, chunk audio into 10-minute segments,
 * and perform speaker diarization via Gemini Multimodal Audio API.
 */

const { Worker } = require('bullmq');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');
const geminiService = require('./geminiService');
const lectureSummaryService = require('./lectureSummaryService');

const CHUNK_DURATION_SECONDS = 600; // 10 minutes

/**
 * Splits audio file into 10-minute segments using ffmpeg.
 */
async function splitAudio(filePath, outputDir) {
  await fs.ensureDir(outputDir);
  return new Promise((resolve, reject) => {
    const pattern = path.join(outputDir, 'chunk_%03d.mp3');
    ffmpeg(filePath)
      .outputOptions([
        '-f segment',
        `-segment_time ${CHUNK_DURATION_SECONDS}`,
        '-c copy',
      ])
      .output(pattern)
      .on('end', async () => {
        const files = await fs.readdir(outputDir);
        const chunkPaths = files
          .filter((file) => file.startsWith('chunk_'))
          .sort()
          .map((file) => path.join(outputDir, file));
        resolve(chunkPaths);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Worker processor for lecture audio jobs.
 */
const audioLectureWorker = new Worker(
  'lecture-audio-processing',
  async (job) => {
    const { lectureId, filePath } = job.data;
    const outputDir = path.join('/tmp/audio_chunks', lectureId);

    try {
      job.updateProgress(10);

      // Step 1: Chunk audio into 10-minute segments
      const chunkPaths = await splitAudio(filePath, outputDir);
      job.updateProgress(30);

      const transcriptSegments = [];
      let totalDurationOffset = 0;

      // Step 2: Transcribe each segment with speaker diarization
      for (let i = 0; i < chunkPaths.length; i += 1) {
        const chunkPath = chunkPaths[i];
        const audioBuffer = await fs.readFile(chunkPath);

        const prompt = `
          Transcribe this lecture audio accurately with speaker diarization.
          Label speakers clearly as [Speaker 0: Professor] or [Speaker 1: Student].
          Include accurate timestamps relative to the start of this audio clip.
        `;

        const chunkTranscript = await geminiService.generateMultimodalContent({
          prompt,
          audioBuffer,
          mimeType: 'audio/mp3',
        });

        transcriptSegments.push({
          chunkIndex: i,
          offsetSeconds: totalDurationOffset,
          text: chunkTranscript,
        });

        totalDurationOffset += CHUNK_DURATION_SECONDS;
        job.updateProgress(30 + Math.floor(((i + 1) / chunkPaths.length) * 40));
      }

      const fullTranscript = transcriptSegments.map((s) => s.text).join('\n\n');

      // Step 3: Extract chapters, formulas, and flashcards
      const analysis = await lectureSummaryService.processLectureTranscript(fullTranscript);
      job.updateProgress(90);

      // Clean up temporary audio files
      await fs.remove(outputDir);
      await fs.remove(filePath);

      job.updateProgress(100);
      return {
        lectureId,
        transcript: fullTranscript,
        chapters: analysis.chapters,
        flashcards: analysis.flashcards,
      };
    } catch (error) {
      console.error(`[AudioWorker] Error processing lecture ${lectureId}:`, error);
      await fs.remove(outputDir).catch(() => {});
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
    },
  }
);

module.exports = audioLectureWorker;
