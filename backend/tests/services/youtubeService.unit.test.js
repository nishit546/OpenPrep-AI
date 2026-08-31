const { extractYoutubeId, extractVideoId, chunkTranscriptByChapters } = require('../../services/youtubeService');

describe('YouTube Ingestion Utility Testing Matrix', () => {
  test('should parse discrete video identifiers across highly variable URL strings', () => {
    const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const shortenedUrl = 'https://youtu.be/dQw4w9WgXcQ';
    const embedUrl = 'https://youtube.com/embed/dQw4w9WgXcQ';
    const shortsUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';

    expect(extractYoutubeId(standardUrl)).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId(shortenedUrl)).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId(embedUrl)).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeId(shortsUrl)).toBe('dQw4w9WgXcQ');
    expect(extractVideoId(standardUrl)).toBe('dQw4w9WgXcQ');
  });

  test('rejects malicious SSRF url strings pointing to internal IPs or local domains', () => {
    expect(extractYoutubeId('https://127.0.0.1/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYoutubeId('https://localhost/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYoutubeId('https://malicious-server.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYoutubeId('https://youtube.com.attacker.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  test('should segment linear caption arrays correctly into their relative chapter bounds', () => {
    const rawCaptions = [
      { start: 5, text: 'Intro statement.' },
      { start: 310, text: 'Deep core item.' }
    ];
    const targetChapters = [
      { start: 0, title: 'Intro' },
      { start: 300, title: 'Core' }
    ];

    const result = chunkTranscriptByChapters(rawCaptions, targetChapters);
    expect(result).toHaveLength(2);
    expect(result[0].chapterTitle).toBe('Intro');
    expect(result[1].combinedText).toContain('Deep core item.');
  });

  test('throws error when captions are empty or invalid', () => {
    expect(() => chunkTranscriptByChapters([])).toThrow('CAPTI_ONS_EMPTY_OR_INVALID');
  });
});

