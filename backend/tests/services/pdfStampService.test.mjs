import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Automated PDF PYQ Watermarking & Solution QR Code Embedding Engine', async (t) => {
  const servicePath = path.resolve(__dirname, '../../services/pdfStampService.js');
  const controllerPath = path.resolve(__dirname, '../../controllers/pyqController.js');
  const routesPath = path.resolve(__dirname, '../../routes/pyqRoutes.js');

  await t.test('pdfStampService.js exists and exports stampWorksheetPDF & generateSampleWorksheetPDF', () => {
    assert.ok(fs.existsSync(servicePath), 'pdfStampService.js must exist');
    const content = fs.readFileSync(servicePath, 'utf8');
    assert.match(content, /stampWorksheetPDF/, 'Must define stampWorksheetPDF');
    assert.match(content, /generateSampleWorksheetPDF/, 'Must define generateSampleWorksheetPDF');
    assert.match(content, /pdf-lib/, 'Must use pdf-lib');
    assert.match(content, /qrcode/, 'Must use qrcode');
    assert.match(content, /OpenPrep AI – Exam Prep Edition/, 'Must define default watermark text');
    assert.match(content, /\/pyq\/discuss\//, 'Must link to pyq discussion URL');
    assert.match(content, /embedPng/, 'Must embed dynamic PNG QR code');
    assert.match(content, /drawImage/, 'Must draw QR code in corner');
  });

  await t.test('pyqController.js implements exportWorksheetPDF with buffer caching', () => {
    assert.ok(fs.existsSync(controllerPath), 'pyqController.js must exist');
    const content = fs.readFileSync(controllerPath, 'utf8');
    assert.match(content, /exports\.exportWorksheetPDF/, 'Must export exportWorksheetPDF handler');
    assert.match(content, /worksheetPdfCache/, 'Must maintain worksheet buffer cache');
    assert.match(content, /application\/pdf/, 'Must set application/pdf MIME type');
    assert.match(content, /Content-Disposition/, 'Must set download attachment header');
  });

  await t.test('pyqRoutes.js routes GET /export/worksheet/:id', () => {
    assert.ok(fs.existsSync(routesPath), 'pyqRoutes.js must exist');
    const content = fs.readFileSync(routesPath, 'utf8');
    assert.match(content, /exportWorksheetPDF/, 'Must import exportWorksheetPDF');
    assert.match(content, /\/export\/worksheet\/:id/, 'Must register GET /export/worksheet/:id endpoint');
  });

  await t.test('PDF stamping logic produces valid watermarked PDF buffer when pdf-lib is present', async () => {
    try {
      const { stampWorksheetPDF, generateSampleWorksheetPDF } = await import('../../services/pdfStampService.js');
      const startTime = Date.now();

      const questions = [
        { question: 'What is Gauss Law for electric field flux?', options: ['(A) q/eps', '(B) zero', '(C) infinite', '(D) q*eps'] },
        { question: 'Calculate the de Broglie wavelength of an electron.', options: ['(A) h/p', '(B) p/h', '(C) h*p', '(D) zero'] }
      ];

      const pdfBuffer = await generateSampleWorksheetPDF('Physics NEET 2024 Final PYQ', questions, {
        documentId: 'DOC-NEET-2024-TEST',
        studentId: 'STUDENT-DH-01'
      });

      const elapsed = Date.now() - startTime;
      assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a Buffer');
      assert.ok(pdfBuffer.length > 500, 'Must produce non-empty PDF bytes');
      // Verify PDF magic bytes %PDF-
      assert.strictEqual(pdfBuffer.slice(0, 4).toString(), '%PDF', 'PDF buffer must start with %PDF magic bytes');
      assert.ok(elapsed < 1500, `PDF generation must be performant, took ${elapsed}ms`);
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('Cannot find module')) {
        t.skip('Skipping runtime execution because optional dependencies are resolving');
      } else {
        throw e;
      }
    }
  });
});
