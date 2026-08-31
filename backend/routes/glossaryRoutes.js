/**
 * @fileoverview API routes for Contextual In-Text Dictionary and Glossary Generator.
 */
const express = require('express');
const router = express.Router();
const glossaryController = require('../controllers/glossaryController');

/**
 * @route   POST /api/glossary/define
 * @desc    Generate an AI definition for a selected term
 * @access  Private
 */
router.post('/define', glossaryController.getTermDefinition);

/**
 * @route   POST /api/glossary/save
 * @desc    Save a term to the user's personal glossary
 * @access  Private
 */
router.post('/save', glossaryController.saveTerm);

/**
 * @route   GET /api/glossary
 * @desc    Fetch the user's personal glossary with optional subject filter
 * @access  Private
 */
router.get('/', glossaryController.getGlossary);

module.exports = router;
