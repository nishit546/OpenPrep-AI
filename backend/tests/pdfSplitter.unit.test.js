const { PDFDocument } = require('pdf-lib');
const pdfStructureService = require('../services/pdfStructureService');
const pdfSplitterService = require('../services/pdfSplitterService');

describe('Smart PDF Splitter & TOC Extractor (#2077)', () => {
  let samplePdfBuffer;

  beforeAll(async () => {
    // Generate a synthetic 10-page test PDF document
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 10; i++) {
      const page = doc.addPage([400, 600]);
      // Note: Minimal page content
    }
    const bytes = await doc.save();
    samplePdfBuffer = Buffer.from(bytes);
  });

  describe('1. TOC Regex & Text Extraction', () => {
    it('should parse multi-format Table of Contents lines', () => {
      const mockTocText = `
        TABLE OF CONTENTS
        Chapter 1: Foundations of Machine Learning ......... 1
        Chapter 2: Neural Networks & Backpropagation ....... 4
        Chapter 3: Transformers and LLM Architectures ...... 8
      `;

      const entries = pdfStructureService.extractTocFromText(mockTocText, 10);

      expect(entries.length).toBe(3);
      expect(entries[0].title).toContain('Foundations of Machine Learning');
      expect(entries[0].startPage).toBe(1);
      expect(entries[0].endPage).toBe(3);
      expect(entries[1].startPage).toBe(4);
      expect(entries[1].endPage).toBe(7);
      expect(entries[2].startPage).toBe(8);
      expect(entries[2].endPage).toBe(10);
    });

    it('should auto-partition documents into sensible modules when TOC is missing', async () => {
      const result = await pdfStructureService.inspectPdfStructure(samplePdfBuffer);

      expect(result.totalPages).toBe(10);
      expect(result.chapters.length).toBeGreaterThan(0);
      expect(result.chapters[0].startPage).toBe(1);
    });
  });

  describe('2. PDF Chunking & Splitting Engine', () => {
    it('should split PDF into distinct chapter sub-documents accurately', async () => {
      const chaptersToSplit = [
        { title: 'Intro Section', startPage: 1, endPage: 3 },
        { title: 'Advanced Core', startPage: 4, endPage: 8 },
      ];

      const splitResults = await pdfSplitterService.splitPdfIntoChapters(
        samplePdfBuffer,
        chaptersToSplit
      );

      expect(splitResults.length).toBe(2);
      expect(splitResults[0].pageCount).toBe(3);
      expect(splitResults[1].pageCount).toBe(5);
      expect(Buffer.isBuffer(splitResults[0].buffer)).toBe(true);

      // Verify sub-document page count
      const subDoc1 = await PDFDocument.load(splitResults[0].buffer);
      expect(subDoc1.getPageCount()).toBe(3);

      const subDoc2 = await PDFDocument.load(splitResults[1].buffer);
      expect(subDoc2.getPageCount()).toBe(5);
    });

    it('should package split sub-PDFs into a valid zip archive', async () => {
      const chaptersToSplit = [
        { title: 'Chapter 1', startPage: 1, endPage: 2 },
      ];
      const splitResults = await pdfSplitterService.splitPdfIntoChapters(
        samplePdfBuffer,
        chaptersToSplit
      );

      const zipBuffer = pdfSplitterService.createSplitZipArchive(splitResults);
      expect(Buffer.isBuffer(zipBuffer)).toBe(true);
      expect(zipBuffer.length).toBeGreaterThan(50);
    });
  });
});
