const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

let QRCode;
try {
  QRCode = require('qrcode');
} catch (e) {
  QRCode = null;
}
let qrImage;
try {
  qrImage = require('qr-image');
} catch (e) {
  qrImage = null;
}

const SECRET_KEY = process.env.CERTIFICATE_HMAC_SECRET || 'openprep-secret-token-holder';

// In-memory database lookup representation mapping active issue bounds
const mockCertificateDatabase = {
  'c8f74211-1963-4063-8a3d-0970abc12345': {
    id: 'c8f74211-1963-4063-8a3d-0970abc12345',
    recipientName: 'Aditya Patel',
    credentialTitle: '30-Day Intensive Data Structures Sprint Mastery',
    issueDate: '2026-08-31',
  },
};

/**
 * Calculates a secure, tamper-proof signature for a certificate payload.
 */
function computeCertificateSignature(certId, recipientName, credentialTitle) {
  const hashPayload = `${certId}:${recipientName}:${credentialTitle}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(hashPayload).digest('hex');
}

/**
 * Helper to generate QR code PNG buffer.
 */
async function generateQrPngBuffer(url) {
  if (QRCode) {
    return await QRCode.toBuffer(url, { type: 'png', margin: 1 });
  }
  if (qrImage) {
    return qrImage.imageSync(url, { type: 'png', margin: 1 });
  }
  return null;
}

/**
 * Generates a crisp, printable digital PDF credential package using pdfkit.
 */
async function generateCertificatePdf(metadata) {
  const { certId, recipientName, credentialTitle, issueDate, signature } = metadata;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const width = 842;
      const height = 595;

      // Draw Outer and Inner Borders
      doc.rect(20, 20, width - 40, height - 40).lineWidth(3).stroke('#1f2937');
      doc.rect(30, 30, width - 60, height - 60).lineWidth(1).stroke('#d97706');

      // Title & Headers
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1f2937').text('OPENPREP AI CREDENTIAL NETWORK', 0, 70, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(28).fillColor('#d97706').text('Certificate of Achievement', 0, 120, { align: 'center' });

      doc.font('Helvetica').fontSize(12).fillColor('#6b7280').text('This honors milestone verification is proudly awarded to:', 0, 190, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827').text(recipientName || 'OpenPrep Scholar', 0, 230, { align: 'center' });

      doc.font('Helvetica').fontSize(12).fillColor('#6b7280').text('for successfully mastering the curriculum criteria for:', 0, 290, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1f2937').text(credentialTitle || 'Mastery Certification', 0, 330, { align: 'center' });

      // Embed QR code
      const verificationUrl = `https://openprep.ai/verify/${certId}`;
      try {
        const qrBuffer = await generateQrPngBuffer(verificationUrl);
        if (qrBuffer) {
          doc.image(qrBuffer, 60, 440, { width: 80, height: 80 });
          doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text('Scan to Verify Authenticity', 50, 525);
        }
      } catch (e) {
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(`Verify: ${verificationUrl}`, 60, 480);
      }

      // Footers & Hash Proof
      const sigHex = signature || computeCertificateSignature(certId, recipientName || '', credentialTitle || '');
      const formattedDate = issueDate || new Date().toISOString().split('T')[0];

      doc.font('Helvetica').fontSize(10).fillColor('#4b5563').text(`Issue Date: ${formattedDate}`, width - 340, 470, { align: 'right' });
      doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text(`Cryptographic Hash: ${sigHex.slice(0, 32)}...`, width - 340, 490, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Mint certificate helper.
 */
function mintCertificate({ certId = uuidv4(), recipientName, credentialTitle, issueDate = new Date().toISOString().split('T')[0] }) {
  const signature = computeCertificateSignature(certId, recipientName, credentialTitle);
  const record = {
    id: certId,
    recipientName,
    credentialTitle,
    issueDate,
    signature,
  };
  mockCertificateDatabase[certId] = record;
  return record;
}

/**
 * Get certificate record from registry.
 */
function getCertificateRecord(certId) {
  return mockCertificateDatabase[certId] || null;
}

module.exports = {
  computeCertificateSignature,
  generateCertificatePdf,
  mintCertificate,
  getCertificateRecord,
  mockCertificateDatabase,
};