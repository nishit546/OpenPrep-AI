const PDFAnnotation = require('../models/PDFAnnotation');
const sanitizeHtml = require('sanitize-html');

exports.getAnnotations = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;

    const annotations = await PDFAnnotation.findAll({
      where: {
        documentId,
        userId: req.user.id,
      },
      order: [['pageNumber', 'ASC'], ['createdAt', 'ASC']],
    });

    res.status(200).json({ success: true, data: annotations });
  } catch (error) {
    next(error);
  }
};

exports.saveAnnotation = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const { pageNumber, rectsData, color, commentText } = req.body;
    const safeCommentText = commentText
      ? sanitizeHtml(commentText, { allowedTags: [], allowedAttributes: {} })
      : commentText;

    const annotation = await PDFAnnotation.create({
      documentId,
      userId: req.user.id,
      pageNumber: pageNumber || 1,
      rectsData: rectsData || [],
      color: color || '#FFE900',
      commentText: safeCommentText,
    });
    res.status(201).json({ success: true, data: annotation });
  } catch (error) {
    next(error);
  }
};

exports.syncAnnotations = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const { annotations = [] } = req.body;

    // Delete existing annotations for this document & user before inserting updated set
    await PDFAnnotation.destroy({
      where: {
        documentId,
        userId: req.user.id,
      },
    });

    const created = await Promise.all(
      annotations.map((ann) =>
        PDFAnnotation.create({
          documentId,
          userId: req.user.id,
          pageNumber: ann.pageNumber || 1,
          rectsData: ann.rectsData || [],
          color: ann.color || '#FFE900',
          commentText: ann.commentText
            ? sanitizeHtml(ann.commentText, { allowedTags: [], allowedAttributes: {} })
            : null,
        })
      )
    );

    res.status(200).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.exportHighlights = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;

    const annotations = await PDFAnnotation.findAll({
      where: {
        documentId,
        userId: req.user.id,
      },
      order: [['pageNumber', 'ASC'], ['createdAt', 'ASC']],
    });

    const keyConcepts = [];
    const definitions = [];
    const formulas = [];
    const notes = [];

    annotations.forEach((ann) => {
      const page = ann.pageNumber;
      if (ann.commentText) {
        notes.push(`- **Page ${page} Note**: ${ann.commentText}`);
      }

      if (Array.isArray(ann.rectsData)) {
        ann.rectsData.forEach((r) => {
          const text = r.selectedText;
          if (!text) return;
          if (r.category === 'definition' || ann.color === '#90EE90') {
            definitions.push(`- **Page ${page}**: ${text}`);
          } else if (r.category === 'formula' || ann.color === '#FF9EDB') {
            formulas.push(`- **Page ${page}**: \`${text}\``);
          } else {
            keyConcepts.push(`- **Page ${page}**: ${text}`);
          }
        });
      }
    });

    let markdown = `# Study Highlights & Notes: Document ${documentId}\n\n`;
    markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    markdown += `---\n\n`;

    markdown += `## 📌 Key Concepts\n`;
    markdown += keyConcepts.length > 0 ? `${keyConcepts.join('\n')}\n\n` : `*No key concepts highlighted yet.*\n\n`;

    markdown += `## 📖 Definitions\n`;
    markdown += definitions.length > 0 ? `${definitions.join('\n')}\n\n` : `*No definitions highlighted yet.*\n\n`;

    markdown += `## 📐 Formulas & Equations\n`;
    markdown += formulas.length > 0 ? `${formulas.join('\n')}\n\n` : `*No formulas highlighted yet.*\n\n`;

    markdown += `## 📝 Sticky Notes & Annotations\n`;
    markdown += notes.length > 0 ? `${notes.join('\n')}\n\n` : `*No sticky notes added yet.*\n\n`;

    res.status(200).json({
      success: true,
      data: {
        filename: `document-${documentId}-study-highlights.md`,
        markdown,
      },
    });
  } catch (error) {
    next(error);
  }
};
