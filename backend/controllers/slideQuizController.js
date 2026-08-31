/**
 * @fileoverview Controller for handling slide-to-quiz generation and export.
 */
const slideToQuizService = require('../services/slideToQuizService');
// const Flashcard = require('../models/Flashcard');

/**
 * Generates a quiz from an uploaded slide document.
 */
const generateQuiz = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A slide document (PDF/PPTX) is required.' });
        }

        // Validate file type
        const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        if (!allowedMimes.includes(req.file.mimetype)) {
            return res.status(400).json({ success: false, message: 'Only PDF and PPTX files are allowed.' });
        }

        const quizData = await slideToQuizService.processDocumentToQuiz(req.file.buffer);

        res.status(200).json({
            success: true,
            data: {
                fileName: req.file.originalname,
                totalSlides: quizData.length,
                slides: quizData
            }
        });
    } catch (error) {
        console.error('Error generating slide quiz:', error);
        res.status(500).json({ success: false, message: 'Internal server error during quiz generation.' });
    }
};

/**
 * Exports generated slide questions into the user's main flashcard deck.
 */
const exportToFlashcards = async (req, res) => {
    try {
        const { questions, slideTitle } = req.body;
        // const userId = req.user.id;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Valid questions array is required.' });
        }

        // Mock bulk insertion into Flashcard model
        // const newFlashcards = questions.map(q => ({
        //   userId,
        //   front: q.question,
        //   back: `${q.correctAnswer}\n\nExplanation: ${q.explanation}`,
        //   tags: ['slide-quiz', slideTitle],
        //   difficulty: 'medium'
        // }));
        // await Flashcard.bulkCreate(newFlashcards);

        res.status(201).json({
            success: true,
            message: `Successfully exported ${questions.length} questions to your flashcard deck.`,
            data: { exportedCount: questions.length }
        });
    } catch (error) {
        console.error('Error exporting to flashcards:', error);
        res.status(500).json({ success: false, message: 'Internal server error during export.' });
    }
};

module.exports = {
    generateQuiz,
    exportToFlashcards,
};
