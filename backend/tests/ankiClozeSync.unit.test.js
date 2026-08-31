const ankiPackageService = require('../../backend/services/ankiPackageService');
const clozeExtractionService = require('../../backend/services/clozeExtractionService');

describe('Anki .apkg Import/Export & AI Cloze Sync Engine (#2069)', () => {
  describe('1. Anki Package Builder (.apkg)', () => {
    it('should generate valid binary .apkg buffer with Anki 2.1 SQLite schema and cards', async () => {
      const mockCards = [
        {
          front: 'What is the primary site of photosynthesis in plants?',
          back: 'Chloroplasts',
          tags: ['biology', 'botany'],
          interval: 4,
          efactor: 2.5,
          repetitions: 3,
        },
        {
          front: 'The citric acid cycle takes place in the {{c1::mitochondrial matrix}}.',
          back: 'Cellular Respiration',
          isCloze: true,
          tags: ['biochemistry'],
          interval: 1,
          efactor: 2.5,
          repetitions: 0,
        },
      ];

      const buffer = await ankiPackageService.buildAnkiPackage(mockCards, 'Biology 101');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);

      // Verify bidirectional roundtrip parsing
      const parsed = await ankiPackageService.parseAnkiPackage(buffer);
      expect(parsed.cards.length).toBe(2);
      expect(parsed.decks.length).toBeGreaterThanOrEqual(1);
      expect(parsed.cards[0].front).toContain('photosynthesis');
      expect(parsed.cards[1].front).toContain('{{c1::mitochondrial matrix}}');
      expect(parsed.cards[1].isCloze).toBe(true);
    });
  });

  describe('2. AI Cloze Extraction Service', () => {
    it('should extract structured Cloze cards with {{c1::...}} syntax from text', async () => {
      const sampleText = 'Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating ATP in the cytosol.';

      const clozeCards = await clozeExtractionService.generateClozeCardsFromText(sampleText, {
        count: 2,
        subject: 'Biochemistry',
      });

      expect(Array.isArray(clozeCards)).toBe(true);
      expect(clozeCards.length).toBeGreaterThan(0);
      expect(clozeCards[0].front).toMatch(/\{\{c\d+::/);
      expect(clozeCards[0].isCloze).toBe(true);
    });

    it('should provide deterministic fallback when raw text is provided', () => {
      const sampleText = 'Mitochondria is defined as the powerhouse of the eukaryotic cell.';
      const fallback = clozeExtractionService.heuristicClozeExtract(sampleText, 2);

      expect(fallback.length).toBeGreaterThan(0);
      expect(fallback[0].front).toContain('{{c1::');
    });
  });
});
