const { expect, describe, it, vi, beforeEach } = require('vitest');

// Mock dependencies
vi.mock('../../models/PDFAnnotation', () => {
  return {
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
  };
});

const PDFAnnotation = require('../../models/PDFAnnotation');
const {
  getAnnotations,
  saveAnnotation,
  syncAnnotations,
  exportHighlights,
} = require('../../controllers/pdfAnnotationController');

describe('PDF Annotation & Highlight Export Controller (#2205)', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('should fetch annotations for document owned by user', async () => {
    const mockData = [
      { id: 'ann-1', documentId: 'doc-123', userId: 'user-456', pageNumber: 1, color: '#FFE900' },
    ];
    PDFAnnotation.findAll.mockResolvedValue(mockData);

    await getAnnotations(req, res, next);

    expect(PDFAnnotation.findAll).toHaveBeenCalledWith({
      where: { documentId: 'doc-123', userId: 'user-456' },
      order: [['pageNumber', 'ASC'], ['createdAt', 'ASC']],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
  });

  it('should save a single annotation with sanitized commentText', async () => {
    req.body = {
      pageNumber: 1,
      rectsData: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
      color: '#90EE90',
      commentText: '<script>alert("xss")</script>Important Definition',
    };

    const mockSaved = { id: 'ann-2', ...req.body, commentText: 'Important Definition' };
    PDFAnnotation.create.mockResolvedValue(mockSaved);

    await saveAnnotation(req, res, next);

    expect(PDFAnnotation.create).toHaveBeenCalledWith({
      documentId: 'doc-123',
      userId: 'user-456',
      pageNumber: 1,
      rectsData: req.body.rectsData,
      color: '#90EE90',
      commentText: 'Important Definition',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockSaved });
  });

  it('should generate Markdown study highlights grouped by category', async () => {
    const mockAnnotations = [
      {
        pageNumber: 1,
        color: '#FFE900',
        commentText: null,
        rectsData: [{ category: 'key_concept', selectedText: 'Key Concept Text' }],
      },
      {
        pageNumber: 2,
        color: '#90EE90',
        commentText: null,
        rectsData: [{ category: 'definition', selectedText: 'Definition Text' }],
      },
      {
        pageNumber: 3,
        color: '#FF9EDB',
        commentText: null,
        rectsData: [{ category: 'formula', selectedText: 'Formula Text' }],
      },
      {
        pageNumber: 4,
        color: '#FFE900',
        commentText: 'Check page 4 reference',
        rectsData: [],
      },
    ];

    PDFAnnotation.findAll.mockResolvedValue(mockAnnotations);

    await exportHighlights(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    expect(jsonCall.data.filename).toBe('document-doc-123-study-highlights.md');
    expect(jsonCall.data.markdown).toContain('# Study Highlights & Notes: Document doc-123');
    expect(jsonCall.data.markdown).toContain('📌 Key Concepts');
    expect(jsonCall.data.markdown).toContain('Key Concept Text');
    expect(jsonCall.data.markdown).toContain('📖 Definitions');
    expect(jsonCall.data.markdown).toContain('Definition Text');
    expect(jsonCall.data.markdown).toContain('📐 Formulas & Equations');
    expect(jsonCall.data.markdown).toContain('Formula Text');
    expect(jsonCall.data.markdown).toContain('Check page 4 reference');
  });
});
