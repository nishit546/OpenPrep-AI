const { YoutubeTranscript } = require('youtube-transcript');
const cacheManager = require('../utils/cacheManager');

// Strict YouTube URL Regex to prevent SSRF
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;

/**
 * Extracts a unique 11-character video ID from varied YouTube URLs.
 */
function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Security check: ensure domain belongs to youtube.com or youtu.be
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'youtu.be' && host !== 'm.youtube.com') {
      return null;
    }
  } catch (e) {
    return null;
  }

  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Legacy wrapper for extractYoutubeId
 */
function extractVideoId(url) {
  return extractYoutubeId(url);
}

/**
 * Validates raw captions and batches text arrays into blocks aligned with video chapters.
 */
function chunkTranscriptByChapters(captions, chapters = []) {
  if (!Array.isArray(captions) || captions.length === 0) {
    throw new Error('CAPTI_ONS_EMPTY_OR_INVALID');
  }

  let activeChapters = Array.isArray(chapters) && chapters.length > 0 ? chapters : [];
  
  if (activeChapters.length === 0) {
    const maxTime = Math.max(...captions.map(c => c.start || 0), 300);
    const intervals = [];
    const step = 300; // 5 minute buckets
    const defaultTitles = ["Introduction", "Core Concepts", "Advanced Analysis", "Key Takeaways", "Summary"];
    
    let index = 0;
    for (let start = 0; start <= maxTime; start += step) {
      const title = defaultTitles[index] || `Section ${index + 1}`;
      intervals.push({ start, title });
      index++;
    }
    activeChapters = intervals;
  }

  const groupedChunks = activeChapters.map((chapter, index) => {
    const nextChapterStart = activeChapters[index + 1]?.start !== undefined ? activeChapters[index + 1].start : Infinity;
    
    // Filter matching timed caption fragments matching this block boundary
    const textBlock = captions
      .filter(item => item.start >= chapter.start && item.start < nextChapterStart)
      .map(item => item.text)
      .join(' ');

    return {
      chapterTitle: chapter.title,
      startTimestamp: chapter.start,
      combinedText: textBlock.trim()
    };
  }).filter(chunk => chunk.combinedText.length > 0);

  return groupedChunks;
}

/**
 * Fetch transcripts with timestamps for a YouTube video
 * @param {string} videoUrl
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 */
async function fetchTranscript(videoUrl) {
  const videoId = extractYoutubeId(videoUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL pattern');
  }

  const cacheKey = `youtube_transcript:${videoId}`;
  try {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (cacheErr) {
    console.error('Redis cache fetch error:', cacheErr);
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error('Captions are disabled or unavailable for this video');
    }

    try {
      await cacheManager.set(cacheKey, JSON.stringify(transcript), 86400);
    } catch (cacheErr) {
      console.error('Redis cache save error:', cacheErr);
    }

    return transcript;
  } catch (err) {
    console.error('youtube-transcript fetch error:', err);
    throw new Error('Failed to fetch video transcripts. Please verify closed captions are enabled.');
  }
}

module.exports = {
  extractYoutubeId,
  extractVideoId,
  chunkTranscriptByChapters,
  fetchTranscript,
  YOUTUBE_REGEX,
};

