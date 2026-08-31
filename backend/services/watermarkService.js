/**
 * @fileoverview Dynamic Watermarking Engine for PDF Documents.
 * Overlays semi-transparent, rotatable copyright signatures directly across document targets.
 */

/**
 * Overlays dynamic semi-transparent, rotatable copyright watermarks across document targets.
 * @param {Object} doc - PDFKit document instance.
 * @param {Object} [options] - Dynamic watermark options.
 * @param {string} [options.studentName] - Name of student/user.
 * @param {string} [options.email] - Email of student/user.
 * @param {string} [options.institution] - Institution or organization name.
 * @param {string} [options.customText] - Optional custom watermark text override.
 * @param {number} [options.opacity=0.06] - Fill opacity (0.01 to 0.5).
 * @param {number} [options.angle=-35] - Rotation angle in degrees.
 * @param {number} [options.fontSize=7] - Font size for watermark text.
 */
function generateSecureWatermark(doc, options = {}) {
  const {
    studentName = 'Guest User',
    email = '',
    institution = 'OpenPrep AI',
    customText = '',
    opacity = 0.06,
    angle = -35,
    fontSize = 7,
  } = options;

  const timestamp = new Date().toISOString().split('T')[0];
  const userIdentifier = email ? `${studentName.toUpperCase()} (${email.toUpperCase()})` : studentName.toUpperCase();
  
  const defaultText = `DIGITAL RIGHTS SECURITY PROTOCOL - COMPILED FOR: ${userIdentifier} - ${institution.toUpperCase()} - DATE: ${timestamp}`;
  const watermarkText = customText ? customText.toUpperCase() : defaultText;

  doc.save();

  // Set composition opacity state to clear transparency bands without text washouts
  doc.fillOpacity(Math.min(Math.max(opacity, 0.01), 0.5));
  doc.fillColor('#000000');
  doc.fontSize(fontSize);
  doc.font('Helvetica-Bold');

  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;

  // Multi-line diagonal translation tracking path configurations
  for (let offset = -200; offset < pageHeight + 100; offset += 180) {
    doc.save();
    doc.translate(pageWidth / 2, offset);
    doc.rotate(angle, { origin: [0, 0] });
    doc.text(watermarkText, -pageWidth, 0, { width: pageWidth * 2, align: 'center' });
    doc.restore();
  }

  doc.restore();
}

module.exports = { generateSecureWatermark };
