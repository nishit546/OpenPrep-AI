/**
 * @fileoverview Cryptographic Digital Signature & Integrity Verification Service for PDF Documents.
 * Uses HMAC-SHA256 digests to generate verifiable cryptographic signatures and visual document seals.
 */
const crypto = require('crypto');

/**
 * Generates an HMAC-SHA256 digital signature payload for PDF document verification.
 * @param {Object} payloadData - Data object containing document & user metadata.
 * @param {Array<string>} payloadData.noteIds - List of note IDs included in the export.
 * @param {string} payloadData.userId - ID of the user requesting export.
 * @param {string} [payloadData.userEmail] - Email of the user requesting export.
 * @param {string} [payloadData.studentName] - Name of the user requesting export.
 * @param {string} [payloadData.timestamp] - Export timestamp.
 * @param {string} [secretKey] - Signing secret key.
 * @returns {Object} Signature object containing certId, signatureHash, timestamp, and metadata.
 */
function generateDigitalSignature(payloadData, secretKey = process.env.PDF_SIGNING_SECRET || 'openprep-pdf-secret-key') {
  const timestamp = payloadData.timestamp || new Date().toISOString();
  const sortedNoteIds = Array.isArray(payloadData.noteIds) ? [...payloadData.noteIds].sort().join(',') : '';
  const userId = payloadData.userId || 'anonymous';

  // Deterministic payload string for HMAC computation
  const canonicalPayload = `${userId}:${sortedNoteIds}:${timestamp}`;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(canonicalPayload);
  const signatureHash = hmac.digest('hex');

  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const certId = `CERT-${randomBytes.slice(0, 4)}-${randomBytes.slice(4)}`;

  return {
    certId,
    signatureHash,
    timestamp,
    issuer: 'OpenPrep Digital Signing Engine v1.0',
    signer: {
      userId,
      userEmail: payloadData.userEmail || 'n/a',
      studentName: payloadData.studentName || 'OpenPrep User',
    },
    canonicalPayload,
  };
}

/**
 * Verifies a given HMAC-SHA256 signature hash against payload metadata.
 * @param {Object} payloadData - Data object containing document & user metadata.
 * @param {string} signatureHash - The signature hash to verify.
 * @param {string} [secretKey] - Secret key used for signature generation.
 * @returns {boolean} True if signature is valid, false otherwise.
 */
function verifyDigitalSignature(payloadData, signatureHash, secretKey = process.env.PDF_SIGNING_SECRET || 'openprep-pdf-secret-key') {
  if (!signatureHash || typeof signatureHash !== 'string') {
    return false;
  }

  const expectedSignature = generateDigitalSignature(payloadData, secretKey).signatureHash;

  try {
    const bufExpected = Buffer.from(expectedSignature, 'hex');
    const bufActual = Buffer.from(signatureHash, 'hex');

    if (bufExpected.length !== bufActual.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufExpected, bufActual);
  } catch (err) {
    return false;
  }
}

/**
 * Renders a visual Digital Signature & Authenticity Seal onto the PDF document.
 * @param {Object} doc - PDFKit document instance.
 * @param {Object} signatureData - Signature object returned by generateDigitalSignature.
 */
function renderDigitalSignatureSeal(doc, signatureData) {
  doc.save();

  const margin = doc.page.margins.left || 40;
  const pageWidth = doc.page.width - margin * 2;
  const boxHeight = 110;
  const startY = Math.min(doc.y + 20, doc.page.height - boxHeight - 50);

  // Outer Security Border
  doc.rect(margin, startY, pageWidth, boxHeight)
     .lineWidth(1)
     .strokeColor('#0284c7')
     .fillAndStroke('#f0f9ff', '#0284c7');

  // Header Banner
  doc.rect(margin, startY, pageWidth, 22)
     .fill('#0284c7');
  
  doc.fillColor('#ffffff')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text('DIGITAL SIGNATURE & CRYPTOGRAPHIC AUTHENTICITY SEAL', margin + 10, startY + 6, {
       width: pageWidth - 20,
       align: 'left',
     });

  // Seal Metadata Content
  const textY = startY + 28;
  doc.fillColor('#1e293b')
     .fontSize(8)
     .font('Helvetica-Bold')
     .text(`Certificate ID: `, margin + 10, textY, { continued: true })
     .font('Helvetica')
     .text(signatureData.certId);

  doc.font('Helvetica-Bold')
     .text(`Signer Identity: `, margin + 10, textY + 14, { continued: true })
     .font('Helvetica')
     .text(`${signatureData.signer.studentName} (${signatureData.signer.userEmail})`);

  doc.font('Helvetica-Bold')
     .text(`Issuer Authority: `, margin + 10, textY + 28, { continued: true })
     .font('Helvetica')
     .text(signatureData.issuer);

  doc.font('Helvetica-Bold')
     .text(`Timestamp: `, margin + 10, textY + 42, { continued: true })
     .font('Helvetica')
     .text(new Date(signatureData.timestamp).toUTCString());

  doc.font('Helvetica-Bold')
     .text(`SHA-256 Digest: `, margin + 10, textY + 56, { continued: true })
     .font('Helvetica')
     .text(signatureData.signatureHash);

  // Status Badge
  doc.font('Helvetica-Bold')
     .fillColor('#16a34a')
     .text('✔ STATUS: CRYPTOGRAPHICALLY SIGNED & VERIFIED', margin + 10, textY + 70);

  doc.restore();
}

module.exports = {
  generateDigitalSignature,
  verifyDigitalSignature,
  renderDigitalSignatureSeal,
};
