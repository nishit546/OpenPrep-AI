const hybridSearchService = require('../services/hybridSearchService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 500;
const MAX_INDEX_TEXT_LENGTH = 2_000_000;

/**
 * POST /api/documents/search
 * Body: { query: string, documentId?: uuid, limit?: 1-20 }
 * Searches only the authenticated user's document chunks.
 */
async function searchDocuments(req, res) {
  try {
    const { query, documentId } = req.body || {};
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query string is required' });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return res
        .status(400)
        .json({ success: false, error: `Query must be at most ${MAX_QUERY_LENGTH} characters` });
    }
    if (documentId !== undefined && documentId !== null && !UUID_RE.test(String(documentId))) {
      return res.status(400).json({ success: false, error: 'documentId must be a valid UUID' });
    }

    const limit = Math.min(Math.max(parseInt(req.body.limit, 10) || 5, 1), 20);

    const startTime = Date.now();
    const results = await hybridSearchService.hybridSearch(query, {
      userId: req.user.id,
      documentId: documentId || null,
      limit,
    });
    const latencyMs = Date.now() - startTime;

    return res.json({ success: true, latencyMs, results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during document search' });
  }
}

/**
 * POST /api/documents/index
 * Body: { documentId: uuid, text?: string, pages?: [{ page: number, text: string }] }
 * Chunks and embeds the text in the background (inline if the queue is down).
 */
async function indexDocument(req, res) {
  try {
    const { documentId, text, pages } = req.body || {};
    if (!UUID_RE.test(String(documentId || ''))) {
      return res.status(400).json({ success: false, error: 'documentId must be a valid UUID' });
    }

    const validPages =
      Array.isArray(pages) &&
      pages.length > 0 &&
      pages.every((p) => p && Number.isInteger(p.page) && p.page > 0 && typeof p.text === 'string');
    const validText = typeof text === 'string' && text.trim().length > 0;
    if (!validPages && !validText) {
      return res
        .status(400)
        .json({ success: false, error: 'Provide non-empty text, or pages as [{ page, text }]' });
    }

    const totalLength = validPages ? pages.reduce((sum, p) => sum + p.text.length, 0) : text.length;
    if (totalLength > MAX_INDEX_TEXT_LENGTH) {
      return res.status(413).json({ success: false, error: 'Document text is too large to index' });
    }

    const outcome = await hybridSearchService.enqueueDocumentIndexing({
      userId: req.user.id,
      documentId,
      ...(validPages ? { pages } : { text }),
    });

    return res.status(202).json({ success: true, ...outcome });
  } catch (error) {
    console.error('Index error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during document indexing' });
  }
}

async function askDocuments(req, res) {
  try {
    const { query, documentId } = req.body || {};
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const retrievedChunks = await hybridSearchService.hybridSearch(query, {
      userId: req.user.id,
      documentId: documentId || null,
      limit: 5,
    });

    const context = retrievedChunks
      .map(
        (chunk) =>
          `[Citation ID: ${chunk.documentId} | Chapter: ${chunk.metadata.chapter || 'N/A'} | Page: ${chunk.page || 'N/A'}] \n${chunk.content}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are an expert AI study assistant. Answer the student's question strictly using the provided source material excerpts below. You must cite your sources explicitly using the provided Document IDs, chapter names, and page numbers.

Context Chunks:
${context}

Student Question: ${query}
`;

    // Created lazily so merely loading this module does not require an API key.
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      answer: response.text(),
      citations: retrievedChunks.map((c) => ({
        documentId: c.documentId,
        chapter: c.metadata.chapter,
        page: c.page,
      })),
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: 'Internal server error during RAG generation' });
  }
}

module.exports = { searchDocuments, indexDocument, askDocuments };
