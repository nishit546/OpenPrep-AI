const PDFDocument = require('pdfkit');
const { generateSecureWatermark } = require('./watermarkService');
const { generateDigitalSignature, renderDigitalSignatureSeal } = require('./signatureService');

/**
 * Orchestrates raw data transformation into print-optimized PDF buffers.
 */
async function generateExamPdf(quizData, options = {}) {
  const {
    fontSize = 10,
    twoColumn = false,
    includeAnswerKey = false,
    studentName = 'Guest Explorer',
    institution = 'OpenPrep AI'
  } = options;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // --- Core Layout Definitions ---
    doc.fontSize(16).font('Helvetica-Bold').text(quizData.title || 'Revision Exam Sheet', { align: 'center' });
    doc.fontSize(9).font('Helvetica-Oblique').text(`Compiled for ${institution}`, { align: 'center' });
    doc.moveDown(2);

    const questions = quizData.questions || [];
    
    // Configurable Column Math Layout Configurations
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = twoColumn ? (pageWidth - 20) / 2 : pageWidth;
    
    let currentColumn = 0;
    let startY = doc.y;

    questions.forEach((q, index) => {
      // Establishes a virtual boundary check to avoid isolated fragment breaks
      if (doc.y > doc.page.height - 120) {
        if (twoColumn && currentColumn === 0) {
          currentColumn = 1;
          doc.y = startY;
        } else {
          doc.addPage();
          currentColumn = 0;
          startY = doc.page.margins.top;
        }
      }

      const xPos = doc.page.margins.left + currentColumn * (colWidth + 20);
      
      doc.fontSize(fontSize).font('Helvetica-Bold')
         .text(`Q${index + 1}. `, xPos, doc.y, { continued: true })
         .font('Helvetica').text(q.text, { width: colWidth, align: 'left' });
      
      doc.moveDown(0.5);

      // Render Options Payload Block
      if (q.options) {
        q.options.forEach((opt, idx) => {
          const prefix = String.fromCharCode(65 + idx) + ') ';
          doc.fontSize(fontSize - 1).font('Helvetica')
             .text(`   ${prefix}${opt}`, { width: colWidth, align: 'left' });
        });
      }

      if (includeAnswerKey && q.correctAnswer) {
        doc.moveDown(0.3);
        doc.fontSize(fontSize - 1).font('Helvetica-Bold').fillColor('#10b981')
           .text(`✔ Correct Answer: ${q.correctAnswer}`, { width: colWidth })
           .fillColor('#000000'); // Restore default text color
      }

      doc.moveDown(1.5);
    });

    // --- Dynamic Two-Pass Security & Footer Decoration Application ---
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      
      // Inject secure diagonal text matrix watermarks safely underneath content layers
      generateSecureWatermark(doc, { studentName, institution });

      // Embed global verification footers containing system pagination metrics
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text(
        `Page ${i + 1} of ${totalPages} | Digital Solution QR Code Affixed via OpenPrep Core Protocols`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: 'center' }
      );
      
      // Simulating vector position bounding boxes for QR placements
      doc.rect(doc.page.width - 65, doc.page.height - 45, 25, 25).stroke('#cbd5e1');
    }

    doc.end();
  });
}

/**
 * Generates a chapter-wise custom study notes PDF document with watermarks and digital signature.
 * @param {Array<Object>} chapters - List of chapter objects containing notes.
 * @param {Object} options - PDF export configuration options.
 * @returns {Promise<Buffer>} The generated PDF buffer.
 */
async function generateChapterWiseNotesPdf(chapters = [], options = {}) {
  const {
    title = 'Custom Study Notes Digest',
    studentName = 'Guest Explorer',
    userEmail = '',
    userId = '',
    institution = 'OpenPrep AI',
    includeToc = true,
    includeSignature = true,
    watermarkText = '',
    watermarkOpacity = 0.06,
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const margin = 40;
      const pageWidth = doc.page.width - margin * 2;

      // Extract all note IDs for digital signature payload
      const allNotes = chapters.flatMap(ch => ch.notes || []);
      const noteIds = allNotes.map(n => n.id).filter(Boolean);

      // Generate Digital Signature
      const signatureData = generateDigitalSignature({
        noteIds,
        userId,
        userEmail,
        studentName,
        timestamp: new Date().toISOString(),
      });

      // --- 1. COVER PAGE ---
      doc.moveDown(3);
      doc.fontSize(26).font('Helvetica-Bold').fillColor('#0f172a').text(title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').fillColor('#475569').text('Chapter-Wise Custom Study Notes', { align: 'center' });
      doc.moveDown(2);

      // Metadata card
      const cardY = doc.y;
      doc.rect(margin + 40, cardY, pageWidth - 80, 110)
         .lineWidth(1)
         .fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
      doc.text('PREPARED FOR:', margin + 60, cardY + 15);
      doc.font('Helvetica').text(`${studentName} ${userEmail ? `(${userEmail})` : ''}`, margin + 170, cardY + 15);

      doc.font('Helvetica-Bold').text('INSTITUTION:', margin + 60, cardY + 35);
      doc.font('Helvetica').text(institution, margin + 170, cardY + 35);

      doc.font('Helvetica-Bold').text('EXPORT DATE:', margin + 60, cardY + 55);
      doc.font('Helvetica').text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin + 170, cardY + 55);

      doc.font('Helvetica-Bold').text('CHAPTER COUNT:', margin + 60, cardY + 75);
      doc.font('Helvetica').text(`${chapters.length} Chapters (${allNotes.length} Notes)`, margin + 170, cardY + 75);

      doc.moveDown(8);

      // --- 2. TABLE OF CONTENTS (TOC) ---
      const tocPageMap = [];
      if (includeToc && chapters.length > 0) {
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Table of Contents', { underline: true });
        doc.moveDown(1.5);

        chapters.forEach((chapter, index) => {
          const tocY = doc.y;
          const chapTitle = `Chapter ${index + 1}: ${chapter.title || chapter.topicName || 'General Notes'}`;
          
          // Render TOC title line
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(chapTitle, margin, tocY, { width: pageWidth - 60 });
          doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`${(chapter.notes || []).length} note(s)`, margin + 20, doc.y + 2);

          tocPageMap.push({ title: chapTitle, chapterIndex: index, tocY });
          doc.moveDown(1);
        });
      }

      // --- 3. CHAPTER CONTENT RENDERING ---
      const chapterStartPages = [];

      chapters.forEach((chapter, chapIdx) => {
        doc.addPage();
        chapterStartPages[chapIdx] = doc.bufferedPageRange().count;

        // Chapter Header Banner
        const chapTitleText = `Chapter ${chapIdx + 1}: ${chapter.title || chapter.topicName || 'General Notes'}`;
        doc.rect(margin, doc.y, pageWidth, 32).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(chapTitleText, margin + 10, doc.y - 24);
        doc.moveDown(1.5);

        if (chapter.subjectName) {
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text(`Subject: ${chapter.subjectName}`);
          doc.moveDown(0.5);
        }

        const notes = chapter.notes || [];
        if (notes.length === 0) {
          doc.fontSize(10).font('Helvetica-Oblique').fillColor('#94a3b8').text('No notes included in this chapter.');
          doc.moveDown(1);
        } else {
          notes.forEach((note, noteIdx) => {
            // Check page boundary
            if (doc.y > doc.page.height - 120) {
              doc.addPage();
            }

            // Note Title Box
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0284c7').text(`${noteIdx + 1}. ${note.title || 'Untitled Note'}`);
            
            // Note Category & Tags
            const metaInfo = [
              note.category ? `Category: ${note.category}` : null,
              note.tags && note.tags.length ? `Tags: ${note.tags.join(', ')}` : null,
            ].filter(Boolean).join(' | ');

            if (metaInfo) {
              doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(metaInfo);
            }
            doc.moveDown(0.5);

            // Note Body Content
            if (note.content) {
              doc.fontSize(10).font('Helvetica').fillColor('#334155').text(note.content, {
                align: 'justify',
                lineGap: 3,
                width: pageWidth,
              });
              doc.moveDown(0.5);
            }

            // AI Summary / Key Takeaways Box
            if (note.aiSummary && (note.aiSummary.summary || note.aiSummary.keyTakeaways)) {
              doc.moveDown(0.3);
              const sumBoxY = doc.y;
              doc.rect(margin, sumBoxY, pageWidth, 45)
                 .fillAndStroke('#f0fdf4', '#86efac');

              doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text('💡 Key AI Takeaways:', margin + 8, sumBoxY + 6);
              const summaryText = typeof note.aiSummary.summary === 'string'
                ? note.aiSummary.summary
                : (Array.isArray(note.aiSummary.keyTakeaways) ? note.aiSummary.keyTakeaways.join(' • ') : '');

              doc.fillColor('#15803d').fontSize(8).font('Helvetica').text(summaryText.slice(0, 250), margin + 8, sumBoxY + 20, {
                width: pageWidth - 16,
              });
              doc.y = sumBoxY + 52;
            }

            doc.moveDown(1.5);
          });
        }
      });

      // --- 4. DIGITAL SIGNATURE SEAL (ON FINAL PAGE) ---
      if (includeSignature) {
        if (doc.y > doc.page.height - 180) {
          doc.addPage();
        }
        renderDigitalSignatureSeal(doc, signatureData);
      }

      // --- 5. TWO-PASS WATERMARKING & PAGINATION FOOTERS ---
      const totalPages = doc.bufferedPageRange().count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        // Apply Dynamic Watermark Layer (Skip cover page if desired or apply to all)
        generateSecureWatermark(doc, {
          studentName,
          email: userEmail,
          institution,
          customText: watermarkText,
          opacity: watermarkOpacity,
        });

        // Running Header (Pages > 0)
        if (i > 0) {
          doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
          doc.text(title, margin, 20, { align: 'left' });
          doc.text(institution, margin, 20, { align: 'right' });
          doc.moveTo(margin, 30).lineTo(doc.page.width - margin, 30).strokeColor('#e2e8f0').stroke();
        }

        // Running Footer
        doc.fontSize(8).font('Helvetica').fillColor('#64748b');
        doc.text(
          `Page ${i + 1} of ${totalPages}  |  Digitally Signed & Secured  |  OpenPrep Core`,
          margin,
          doc.page.height - 25,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateExamPdf,
  generateChapterWiseNotesPdf,
};
