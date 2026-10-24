const service = require('../../services/hybridSearchService');
const embeddingsProcessor = require('../../services/embeddingsProcessor');

const USER = '11111111-1111-4111-8111-111111111111';
const DOC = '22222222-2222-4222-8222-222222222222';
const vec = (n) => Array(768).fill(n);

// No Gemini call and no database: the embedder and the db handle are injected.
describe('hybridSearchService - document chunk search', () => {
  let db;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    db = { query: vi.fn().mockResolvedValue([]) };
  });

  test('hybridSearch is exported (the controller imports it) and aliases hybridDbSearch', () => {
    expect(typeof service.hybridSearch).toBe('function');
    expect(service.hybridSearch).toBe(service.hybridDbSearch);
  });

  describe('chunkText', () => {
    test('returns [] for empty input and one chunk for short text', () => {
      expect(service.chunkText('   ')).toEqual([]);
      expect(service.chunkText('Kirchhoff current law')).toEqual(['Kirchhoff current law']);
    });

    test('splits long text into bounded overlapping chunks without losing words', () => {
      const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
      const chunks = service.chunkText(text, { size: 200, overlap: 40 });

      expect(chunks.length).toBeGreaterThan(5);
      chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(200));
      const seen = new Set(chunks.flatMap((c) => c.split(' ')));
      for (let i = 0; i < 400; i += 1) expect(seen.has(`word${i}`)).toBe(true);
    });
  });

  describe('hybridDbSearch', () => {
    test('scopes both retrieval lists by userId and uses bind params, not interpolated input', async () => {
      const generateVector = vi.fn().mockResolvedValue(vec(0.1));
      const hostile = "kirchhoff'; DROP TABLE x;--";
      await service.hybridDbSearch(hostile, { userId: USER, limit: 3 }, { db, generateVector });

      const [sql, params] = db.query.mock.calls[0];
      expect(sql.match(/"userId" = \$2::uuid/g)).toHaveLength(2); // vector + fts CTEs
      expect(sql).toContain('websearch_to_tsquery');
      expect(sql).toContain('<=>');
      expect(sql).not.toContain('DROP TABLE');
      expect(params[0]).toBe(`[${vec(0.1).join(',')}]`);
      expect(params[1]).toBe(USER);
      expect(params[2]).toBe(hostile);
      expect(params[3]).toBeNull();
      expect(params[4]).toBe(3);
    });

    test('fuses with RRF k=60, treating a missing rank as no contribution', async () => {
      await service.hybridDbSearch('charge', { userId: USER }, { db, generateVector: vi.fn().mockResolvedValue(vec(0)) });
      const [sql] = db.query.mock.calls[0];
      expect(sql).toContain('COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + f.rank), 0)');
    });

    test('narrows to a document when documentId is given', async () => {
      await service.hybridDbSearch('charge', { userId: USER, documentId: DOC }, { db, generateVector: async () => vec(0) });
      expect(db.query.mock.calls[0][1][3]).toBe(DOC);
    });

    test('falls back to lexical-only (null vector) when embedding fails', async () => {
      const generateVector = vi.fn().mockRejectedValue(new Error('quota exceeded'));
      await service.hybridDbSearch('charge', { userId: USER }, { db, generateVector });
      expect(db.query.mock.calls[0][1][0]).toBeNull();
    });

    test('treats an embedding with the wrong dimension as a failure', async () => {
      await service.hybridDbSearch('charge', { userId: USER }, { db, generateVector: async () => [0.1, 0.2] });
      expect(db.query.mock.calls[0][1][0]).toBeNull();
    });

    test('returns [] without touching the database when userId or query is missing', async () => {
      expect(await service.hybridDbSearch('charge', {}, { db })).toEqual([]);
      expect(await service.hybridDbSearch('   ', { userId: USER }, { db })).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    test('maps rows to results with page refs and an HTML-escaped highlighted snippet', async () => {
      db.query.mockResolvedValue([
        {
          id: 'c1',
          documentId: DOC,
          chunkIndex: 4,
          content: 'Kirchhoff <b>current</b> law',
          pageNumber: 12,
          metadata: null,
          score: '0.0327868852',
        },
      ]);
      const out = await service.hybridDbSearch('current law', { userId: USER }, { db, generateVector: async () => vec(0) });

      expect(out).toEqual([
        expect.objectContaining({ id: 'c1', documentId: DOC, chunkIndex: 4, page: 12, metadata: {}, score: 0.03279 }),
      ]);
      expect(out[0].snippet).toContain('<mark>current</mark>');
      expect(out[0].snippet).not.toContain('<b>');
    });

    test('uses embeddingsProcessor.generateVector by default (Gemini mocked)', async () => {
      const spy = vi.spyOn(embeddingsProcessor, 'generateVector').mockResolvedValue(vec(0.2));
      await service.hybridDbSearch('charge', { userId: USER }, { db });
      expect(spy).toHaveBeenCalledWith('charge');
      expect(db.query.mock.calls[0][1][0]).toBe(`[${vec(0.2).join(',')}]`);
    });
  });

  describe('indexDocumentChunks', () => {
    test('embeds each chunk and stores it for the owning user with its page number', async () => {
      const generateVector = vi.fn().mockResolvedValue(vec(0.3));
      const result = await service.indexDocumentChunks(
        {
          userId: USER,
          documentId: DOC,
          pages: [
            { page: 1, text: 'First page about Gauss law.' },
            { page: 2, text: 'Second page about Kirchhoff.' },
          ],
        },
        { db, generateVector }
      );

      expect(result).toEqual({ chunks: 2, embeddingFailures: 0 });
      expect(generateVector).toHaveBeenCalledTimes(2);
      const [deleteSql, deleteParams] = db.query.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM document_chunks');
      expect(deleteParams).toEqual([USER, DOC]);
      const inserts = db.query.mock.calls.slice(1);
      expect(inserts).toHaveLength(2);
      expect(inserts[1][1]).toEqual([USER, DOC, 1, 'Second page about Kirchhoff.', 2, `[${vec(0.3).join(',')}]`]);
    });

    test('still stores chunks (null embedding) when Gemini fails, and reports the failures', async () => {
      const generateVector = vi.fn().mockRejectedValue(new Error('429'));
      const result = await service.indexDocumentChunks(
        { userId: USER, documentId: DOC, text: 'Some plain text' },
        { db, generateVector }
      );

      expect(result).toEqual({ chunks: 1, embeddingFailures: 1 });
      expect(db.query.mock.calls[1][1][5]).toBeNull();
    });

    test('requires userId and documentId', async () => {
      await expect(service.indexDocumentChunks({ text: 'x' }, { db })).rejects.toThrow(/required/);
    });
  });

  describe('queue integration', () => {
    test('enqueueDocumentIndexing hands the job to the existing queue', async () => {
      const queueService = { enqueue: vi.fn().mockResolvedValue('job-1'), registerHandler: vi.fn() };
      const payload = { userId: USER, documentId: DOC, text: 'abc' };

      expect(await service.enqueueDocumentIndexing(payload, { queueService })).toEqual({ queued: true });
      expect(queueService.enqueue).toHaveBeenCalledWith('index_document_chunks', payload);
    });

    test('registerIndexingHandler registers a handler that indexes the payload', async () => {
      const queueService = { enqueue: vi.fn(), registerHandler: vi.fn() };
      const generateVector = vi.fn().mockResolvedValue(vec(0.1));
      service.registerIndexingHandler({ queueService, db, generateVector });

      const [name, handler] = queueService.registerHandler.mock.calls[0];
      expect(name).toBe('index_document_chunks');
      await handler({ userId: USER, documentId: DOC, text: 'hello world' });
      expect(db.query).toHaveBeenCalled();
    });
  });
});
