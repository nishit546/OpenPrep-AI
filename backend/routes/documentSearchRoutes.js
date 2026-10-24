const express = require('express');
const { protect } = require('../middleware/auth');
const { searchDocuments, indexDocument } = require('../controllers/ragSearchController');
const { registerIndexingHandler } = require('../services/hybridSearchService');

const router = express.Router();

// Out-of-band chunk + embed jobs are picked up by the shared queue worker.
registerIndexingHandler();

// Hybrid (pgvector + full-text) search over the caller's own documents
router.post('/search', protect, searchDocuments);

// Chunk and embed a document's text so it becomes searchable
router.post('/index', protect, indexDocument);

module.exports = router;
