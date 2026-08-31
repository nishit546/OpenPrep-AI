/**
 * @fileoverview Molecular Structure Controller.
 * Provides endpoints for retrieving 3D molecular structures, annotation hotspots, and AI explanations.
 */
const molecularStructureService = require('../services/molecularStructureService');

/**
 * @desc Get list of available 3D molecular & biological structure presets
 * @route GET /api/molecular/structures
 * @access Public / Protected
 */
exports.getStructures = async (req, res, next) => {
  try {
    const presets = await molecularStructureService.getStructurePresets();
    return res.status(200).json({
      success: true,
      data: presets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get full 3D coordinates, bonds, and annotation hotspots for a structure ID
 * @route GET /api/molecular/structures/:id
 * @access Public / Protected
 */
exports.getStructureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const structure = await molecularStructureService.getStructureById(id);

    if (!structure) {
      return res.status(404).json({
        success: false,
        error: `Molecular structure '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Generate Gemini AI explanation for a 3D molecular hotspot or domain
 * @route POST /api/molecular/explain
 * @access Protected
 */
exports.explainStructure = async (req, res, next) => {
  try {
    const { structureId, hotspotId, prompt } = req.body;

    if (!structureId) {
      return res.status(400).json({
        success: false,
        error: 'structureId parameter is required.',
      });
    }

    const explanation = await molecularStructureService.generateAiExplanation(structureId, hotspotId, prompt);

    return res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    next(error);
  }
};
