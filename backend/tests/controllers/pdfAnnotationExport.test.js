/**
 * Unit tests for pdfAnnotationController.js — Issue #2205
 * Uses vi.spyOn to avoid vi.mock CJS hoisting issues.
 */

const PDFAnnotation = require('../../models/PDFAnnotation');
const sanitizeHtml = require('sanitize-html');
const {
  getAnnotations,
  saveAnnotation,
  exportHighlights,
} = require('../../controllers/pdfAnnotationController');

describe('PDF Annotation & Highlight Export Controller (#2205)', () => {
  let req, res, next;
  let findAllSpy, createSpy;

  beforeEach(() => {
    req = {
      params: { id: 'doc-123' },
      user: { id: 'user-456' },
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();

    // Spy on Sequelize model methods directly
    findAllSpy = vi.spyOn(PDFAnnotation, 'findAll');
    createSpy = vi.spyOn(PDFAnnotation, 'create');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getAnnotations — returns user-scoped annotations for the document', async () => {
    const mockData = [
      { id: 'ann-1', documentId: 'doc-123', userId: 'user-456', pageNumber: 1, color: '#FFE900', rectsData: [] },
    ];
    findAllSpy.mockResolvedValue(mockData);

    await getAnnotations(req, res, next);

    expect(findAllSpy).toHaveBeenCalledWith({
      where: { documentId: 'doc-123', userId: 'user-456' },
      order: [['pageNumber', 'ASC'], ['createdAt', 'ASC']],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    expect(next).not.toHaveBeenCalled();
  });

  it('saveAnnotation — strips HTML and saves with correct fields', async () => {
    req.body = {
      pageNumber: 1,
      rectsData: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
      color: '#90EE90',
      commentText: '<script>alert("xss")</script>Important Definition',
    };
    const mockSaved = { id: 'ann-2', pageNumber: 1, color: '#90EE90', commentText: 'Important Definition' };
    createSpy.mockResolvedValue(mockSaved);

    await saveAnnotation(req, res, next);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-123',
        userId: 'user-456',
        pageNumber: 1,
        color: '#90EE90',
        commentText: 'Important Definition',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockSaved });
    expect(next).not.toHaveBeenCalled();
  });

  it('exportHighlights — generates Cornell Markdown grouped by category', async () => {
    const mockAnnotations = [
      { pageNumber: 1, color: '#FFE900', commentText: null, rectsData: [{ category: 'key_concept', selectedText: 'Key Concept Text' }] },
      { pageNumber: 2, color: '#90EE90', commentText: null, rectsData: [{ category: 'definition', selectedText: 'Definition Text' }] },
      { pageNumber: 3, color: '#FF9EDB', commentText: null, rectsData: [{ category: 'formula', selectedText: 'Formula Text' }] },
      { pageNumber: 4, color: '#FFE900', commentText: 'Check page 4 reference', rectsData: [] },
    ];
    findAllSpy.mockResolvedValue(mockAnnotations);

    await exportHighlights(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const { data } = res.json.mock.calls[0][0];
    expect(data.filename).toBe('document-doc-123-study-highlights.md');
    expect(data.markdown).toContain('# Study Highlights & Notes: Document doc-123');
    expect(data.markdown).toContain('📌 Key Concepts');
    expect(data.markdown).toContain('Key Concept Text');
    expect(data.markdown).toContain('📖 Definitions');
    expect(data.markdown).toContain('Definition Text');
    expect(data.markdown).toContain('📐 Formulas & Equations');
    expect(data.markdown).toContain('Formula Text');
    expect(data.markdown).toContain('Check page 4 reference');
    expect(next).not.toHaveBeenCalled();
  });
});
