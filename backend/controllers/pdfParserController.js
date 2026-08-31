const pdfStructureService = require('../services/pdfStructureService');
const pdfSplitterService = require('../services/pdfSplitterService');
const fs = require('fs');

/**
 * Inspect PDF and Extract Outline / Table of Contents
 * @route POST /api/pdf/inspect-toc
 */
exports.inspectPdfToc = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const result = await pdfStructureService.inspectPdfStructure(fileBuffer);

    if (req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

/**
 * Split PDF into selected chapters and return zip bundle or metadata
 * @route POST /api/pdf/split-chapters
 */
exports.splitPdfChapters = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    let chapters = req.body.chapters;
    if (typeof chapters === 'string') {
      try {
        chapters = JSON.parse(chapters);
      } catch (e) {
        chapters = [];
      }
    }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ success: false, error: 'No chapters selected for splitting.' });
    }

    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const splitChapters = await pdfSplitterService.splitPdfIntoChapters(fileBuffer, chapters);

    if (req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    const zipBuffer = pdfSplitterService.createSplitZipArchive(splitChapters);
    const safeZipName = `split_chapters_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    res.send(zipBuffer);
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};
