const { hybridSearch } = require('../services/hybridSearchService');
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI();

async function searchDocuments(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query string is required' });

    const startTime = Date.now();
    const results = await hybridSearch(query, 5);
    const latency = Date.now() - startTime;

    res.json({ success: true, latencyMs: latency, results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error during document search' });
  }
}

async function askDocuments(req, res) {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query string is required' });

    const retrievedChunks = await hybridSearch(query, 5);

    const context = retrievedChunks
      .map((chunk, idx) => `[Citation ID: ${chunk.document_id} | Chapter: ${chunk.metadata.chapter || 'N/A'} | Page: ${chunk.metadata.page || 'N/A'}] \n${chunk.content}`)
      .join('\n\n---?\n\n');

    const prompt = `You are an expert AI study assistant. Answer the student's question strictly using the provided source material excerpts below. You must cite your sources explicitly using the provided Document IDs, chapter names, and page numbers.

Context Chunks:
${context}

Student Question: ${query}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      answer: response.text(),
      citations: retrievedChunks.map((c) => ({
        documentId: c.document_id,
        chapter: c.metadata.chapter,
        page: c.metadata.page,
      })),
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: 'Internal server error during RAG generation' });
  }
}

module.exports = { searchDocuments, askDocuments };
