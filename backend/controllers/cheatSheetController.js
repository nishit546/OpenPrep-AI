const cheatSheetService = require('../services/cheatSheetService');
const CheatSheet = require('../models/CheatSheet');

/**
 * @desc    Get pre-configured template catalog
 * @route   GET /api/cheat-sheets/templates
 * @access  Private
 */
exports.getTemplates = (req, res) => {
  const templates = cheatSheetService.getTemplateCatalog();
  return res.json({ success: true, data: templates });
};

/**
 * @desc    Validate LaTeX syntax
 * @route   POST /api/cheat-sheets/validate-latex
 * @access  Private
 */
exports.validateLaTeX = (req, res) => {
  const { latex } = req.body;
  const result = cheatSheetService.validateLaTeX(latex);
  return res.json({ success: true, ...result });
};

/**
 * @desc    Create or save custom cheat sheet
 * @route   POST /api/cheat-sheets
 * @access  Private
 */
exports.createCheatSheet = async (req, res) => {
  try {
    const { title, subject, columns, sections, isPublic, tags } = req.body;

    const sheet = await CheatSheet.create({
      userId: req.user.id,
      title: title || 'Quick Revision Sheet',
      subject: subject || 'General',
      columns: columns || 2,
      sections: sections || [],
      isPublic: !!isPublic,
      tags: tags || [],
    });

    return res.status(201).json({ success: true, data: sheet });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get user cheat sheets
 * @route   GET /api/cheat-sheets
 * @access  Private
 */
exports.getUserCheatSheets = async (req, res) => {
  try {
    const sheets = await CheatSheet.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
    });

    try {
      require('../services/metricsService').recordTokensConsumed(
        'gemini-2.5-flash',
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
      );
    } catch (e) {}

    const cheatSheetData = JSON.parse(response.text);

    res.status(200).json({
      success: true,
      cheatSheet: cheatSheetData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
