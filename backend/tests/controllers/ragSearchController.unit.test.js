const hybridSearchService = require('../../services/hybridSearchService');
const { searchDocuments, indexDocument } = require('../../controllers/ragSearchController');

const USER = '11111111-1111-4111-8111-111111111111';
const DOC = '22222222-2222-4222-8222-222222222222';

const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('ragSearchController', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('searchDocuments', () => {
    test('searches with the authenticated user id, never one from the body', async () => {
      const rows = [{ id: 'c1', documentId: DOC, page: 3, content: 'x', snippet: 'x', metadata: {}, score: 0.03 }];
      const spy = vi.spyOn(hybridSearchService, 'hybridSearch').mockResolvedValue(rows);
      const res = makeRes();

      await searchDocuments(
        { user: { id: USER }, body: { query: 'conservation of charge', userId: 'attacker', limit: 500 } },
        res
      );

      expect(spy).toHaveBeenCalledWith('conservation of charge', { userId: USER, documentId: null, limit: 20 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, results: rows }));
    });

    test('passes a valid documentId through', async () => {
      const spy = vi.spyOn(hybridSearchService, 'hybridSearch').mockResolvedValue([]);
      await searchDocuments({ user: { id: USER }, body: { query: 'q', documentId: DOC } }, makeRes());
      expect(spy.mock.calls[0][1].documentId).toBe(DOC);
    });

    test.each([
      [{}],
      [{ query: '   ' }],
      [{ query: 42 }],
      [{ query: 'a'.repeat(501) }],
      [{ query: 'ok', documentId: 'not-a-uuid' }],
    ])('400 for invalid body %j', async (body) => {
      const spy = vi.spyOn(hybridSearchService, 'hybridSearch');
      const res = makeRes();
      await searchDocuments({ user: { id: USER }, body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(spy).not.toHaveBeenCalled();
    });

    test('500 with a generic message when the service throws', async () => {
      vi.spyOn(hybridSearchService, 'hybridSearch').mockRejectedValue(new Error('relation does not exist'));
      const res = makeRes();
      await searchDocuments({ user: { id: USER }, body: { query: 'q' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('relation');
    });
  });

  describe('indexDocument', () => {
    test('queues indexing for the authenticated user and answers 202', async () => {
      const spy = vi.spyOn(hybridSearchService, 'enqueueDocumentIndexing').mockResolvedValue({ queued: true });
      const res = makeRes();
      const pages = [{ page: 1, text: 'hello' }];

      await indexDocument({ user: { id: USER }, body: { documentId: DOC, pages, userId: 'attacker' } }, res);

      expect(spy).toHaveBeenCalledWith({ userId: USER, documentId: DOC, pages });
      expect(res.status).toHaveBeenCalledWith(202);
    });

    test.each([
      [{ documentId: 'nope', text: 'x' }],
      [{ documentId: DOC }],
      [{ documentId: DOC, pages: [{ page: 0, text: 'x' }] }],
    ])('400 for invalid body %j', async (body) => {
      const res = makeRes();
      await indexDocument({ user: { id: USER }, body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
