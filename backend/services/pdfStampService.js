/**
 * Automated PDF PYQ Watermarking & Solution QR Code Embedding Engine
 * Implements high-throughput PDF stamping with semi-transparent diagonal watermarks,
 * page metadata headers/footers, and dynamic QR codes linking to live solutions.
 */

const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

/**
 * Stamps a PDF byte buffer with official watermark, footer metadata and solution QR code.
 *
 * @param {Buffer | Uint8Array} pdfBuffer - Raw PDF bytes to stamp
 * @param {object} options - Stamping options
 * @param {string} [options.documentId] - Unique Document ID (e.g. DOC-PYQ-2026-001)
 * @param {string} [options.studentId] - Student attribution ID
 * @param {string} [options.watermarkText] - Diagonal watermark text
 * @param {string} [options.baseUrl] - Base domain for discussions
 * @param {string} [options.discussionUrl] - Custom QR redirect target
 * @param {Date | string} [options.timestamp] - Generation timestamp
 * @returns {Promise<Buffer>} Watermarked and stamped PDF buffer
 */
async function stampWorksheetPDF(pdfBuffer, options = {}) {
  const {
    documentId = `DOC-PYQ-${Date.now().toString(36).toUpperCase()}`,
    studentId = 'STD-GUEST-USER',
    watermarkText = 'OpenPrep AI – Exam Prep Edition',
    baseUrl = 'https://openprep.ai',
    discussionUrl = null,
    timestamp = new Date()
  } = options;

  const targetQrUrl = discussionUrl || `${baseUrl}/pyq/discuss/${encodeURIComponent(documentId)}`;

  // Load existing PDF document
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Embed standard typography fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Generate high-resolution dynamic QR code image buffer
  const qrImageBuffer = await QRCode.toBuffer(targetQrUrl, {
    type: 'png',
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#111827',
      light: '#ffffff'
    }
  });

  const embeddedQr = await pdfDoc.embedPng(qrImageBuffer);

  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Stamp each page with metadata, watermark, and QR code
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Semi-transparent diagonal background watermark
    const watermarkFontSize = 32;
    const watermarkWidth = fontBold.widthOfTextAtSize(watermarkText, watermarkFontSize);
    const watermarkAngle = degrees(45);

    page.drawText(watermarkText, {
      x: (width - watermarkWidth * 0.707) / 2 - 30,
      y: height / 2 - 40,
      size: watermarkFontSize,
      font: fontBold,
      color: rgb(0.72, 0.75, 0.8),
      opacity: 0.16,
      rotate: watermarkAngle
    });

    // 2. Top Header Metadata Line
    page.drawLine({
      start: { x: 36, y: height - 32 },
      end: { x: width - 36, y: height - 32 },
      thickness: 0.5,
      color: rgb(0.8, 0.83, 0.88)
    });

    page.drawText('OPENPREP AI • OFFICIAL PYQ EXAMINATION WORKSHEET • VERIFIED RESOURCE', {
      x: 36,
      y: height - 26,
      size: 7,
      font: fontBold,
      color: rgb(0.45, 0.5, 0.58)
    });

    // 3. Bottom Footer Metadata Divider Line
    page.drawLine({
      start: { x: 36, y: 48 },
      end: { x: width - 36, y: 48 },
      thickness: 0.5,
      color: rgb(0.8, 0.83, 0.88)
    });

    // 4. Footer Metadata Text
    const footerLine1 = `Document ID: ${documentId}   |   Issued: ${formattedDate}   |   Page ${i + 1} of ${totalPages}`;
    const footerLine2 = `Candidate Attribution: ${studentId}   |   Scan QR code for interactive solutions & doubt discussion`;

    page.drawText(footerLine1, {
      x: 36,
      y: 34,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.3)
    });

    page.drawText(footerLine2, {
      x: 36,
      y: 22,
      size: 6.8,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.58)
    });

    // 5. Stamped QR Code Image in Bottom-Right Corner
    const qrSize = 38;
    const qrX = width - 36 - qrSize;
    const qrY = 6;

    page.drawImage(embeddedQr, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize
    });
  }

  const modifiedBytes = await pdfDoc.save();
  return Buffer.from(modifiedBytes);
}

/**
 * Creates a basic worksheet PDF from scratch and stamps it.
 *
 * @param {string} title - Worksheet title
 * @param {Array<{ question: string, options?: string[], year?: number }>} questions - Question list
 * @param {object} options - Stamping options
 * @returns {Promise<Buffer>}
 */
async function generateSampleWorksheetPDF(title, questions = [], options = {}) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
  let currentY = 760;

  // Title
  page.drawText(title || 'Previous Year Questions Worksheet', {
    x: 40,
    y: currentY,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.2)
  });
  currentY -= 35;

  questions.forEach((q, idx) => {
    if (currentY < 90) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = 780;
    }

    const qText = `Q${idx + 1}. ${q.question || q.questionText || 'Practice question'}`;
    page.drawText(qText, {
      x: 40,
      y: currentY,
      size: 10,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15)
    });
    currentY -= 18;

    const optionsList = q.options || ['(A) Option A', '(B) Option B', '(C) Option C', '(D) Option D'];
    optionsList.forEach((opt) => {
      page.drawText(typeof opt === 'string' ? opt : opt.text || '', {
        x: 55,
        y: currentY,
        size: 9,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25)
      });
      currentY -= 14;
    });

    currentY -= 10;
  });

  const basePdfBytes = await pdfDoc.save();
  return stampWorksheetPDF(Buffer.from(basePdfBytes), options);
}

module.exports = {
  stampWorksheetPDF,
  generateSampleWorksheetPDF
};
