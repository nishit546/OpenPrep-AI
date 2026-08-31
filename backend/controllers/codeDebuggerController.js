/**
 * @fileoverview Controller for handling code explanation and debugging requests.
 */
const codeExplainerService = require('../services/codeExplainerService');

/**
 * Analyzes a code snippet and returns the structured explanation.
 */
const analyzeCode = async (req, res) => {
    try {
        const { code, language } = req.body;

        if (!code || code.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Code snippet is required.' });
        }

        if (!['python', 'javascript', 'java', 'cpp', 'c'].includes(language.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported language. Supported: Python, JavaScript, Java, C++, C.'
            });
        }

        const analysis = await codeExplainerService.explainAndDebugCode(code, language);

        res.status(200).json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error analyzing code:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

module.exports = {
    analyzeCode,
};
