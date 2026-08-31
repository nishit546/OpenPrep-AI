/**
 * @fileoverview Controller for handling accessibility and readability enhancement requests.
 */
const readabilityEnhancerService = require('../services/readabilityEnhancerService');

/**
 * Processes text and returns the enhanced, simplified version with glossary and audio script.
 */
const enhanceText = async (req, res) => {
    try {
        const { text, readingLevel } = req.body;

        if (!text || text.trim().length < 50) {
            return res.status(400).json({
                success: false,
                message: 'Text must be at least 50 characters long to process.'
            });
        }

        if (!['layman', 'high_school', 'undergraduate'].includes(readingLevel)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reading level. Choose layman, high_school, or undergraduate.'
            });
        }

        const enhancedData = await readabilityEnhancerService.enhanceReadability(text, readingLevel);

        res.status(200).json({
            success: true,
            data: enhancedData
        });
    } catch (error) {
        console.error('Error enhancing text:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

module.exports = {
    enhanceText,
};
