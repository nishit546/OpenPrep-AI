/**
 * @fileoverview Controller for managing the personal glossary and AI definition generation.
 */
const glossaryGeneratorService = require('../services/glossaryGeneratorService');
// const GlossaryTerm = require('../models/GlossaryTerm');

/**
 * Generates a definition for a selected term and optionally saves it.
 */
const getTermDefinition = async (req, res) => {
    try {
        const { term, context } = req.body;

        if (!term || term.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'A valid term is required.' });
        }

        const entry = await glossaryGeneratorService.generateGlossaryEntry(term.trim(), context || '');

        res.status(200).json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error getting term definition:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

/**
 * Saves a term to the user's personal glossary.
 */
const saveTerm = async (req, res) => {
    try {
        const { term, definition, relatedConcepts, exampleSentence, subject } = req.body;
        // const userId = req.user.id;

        if (!term || !definition) {
            return res.status(400).json({ success: false, message: 'Term and definition are required.' });
        }

        // Mock DB save
        const newTerm = {
            id: `term_${Date.now()}`,
            term,
            definition,
            relatedConcepts,
            exampleSentence,
            subject: subject || 'General',
            createdAt: new Date().toISOString()
        };

        res.status(201).json({ success: true, data: newTerm, message: 'Term saved to glossary.' });
    } catch (error) {
        console.error('Error saving term:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Fetches the user's personal glossary, optionally filtered by subject.
 */
const getGlossary = async (req, res) => {
    try {
        const { subject } = req.query;

        // Mock glossary data
        const mockGlossary = [
            {
                id: 'term_1',
                term: 'Mitochondria',
                definition: 'The powerhouse of the cell, responsible for generating most of the cell\'s supply of adenosine triphosphate (ATP).',
                relatedConcepts: ['ATP', 'Cellular Respiration', 'Krebs Cycle'],
                exampleSentence: 'The mitochondria produce ATP through oxidative phosphorylation.',
                subject: 'Biology'
            },
            {
                id: 'term_2',
                term: 'Polymorphism',
                definition: 'The occurrence of two or more clearly different morphs or forms in the population of a species.',
                relatedConcepts: ['Genetics', 'Alleles', 'Natural Selection'],
                exampleSentence: 'Genetic polymorphism allows for diverse traits within a single population.',
                subject: 'Biology'
            }
        ];

        let filtered = mockGlossary;
        if (subject) filtered = filtered.filter(t => t.subject === subject);

        res.status(200).json({ success: true, data: filtered });
    } catch (error) {
        console.error('Error fetching glossary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getTermDefinition,
    saveTerm,
    getGlossary,
};
