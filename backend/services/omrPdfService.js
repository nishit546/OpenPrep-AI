const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateOmrSheet(quizData, studentInfo = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 36, bottom: 36, left: 36, right: 36 } });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // 1. Structural Corner Registration Alignment Marks for Scanner/OMR evaluation
      const drawAnchor = (x, y) => {
        doc.circle(x, y, 6).fill('#0F172A');
        doc.rect(x - 12, y - 1, 24, 2).fill('#0F172A');
        doc.rect(x - 1, y - 12, 2, 24).fill('#0F172A');
      };
      drawAnchor(36, 36);       // Top-Left
      drawAnchor(559, 36);      // Top-Right
      drawAnchor(36, 805);      // Bottom-Left
      drawAnchor(559, 805);     // Bottom-Right

      // 2. Dynamic QR Verification Payload Integration
      const quizId = quizData?.id || 'QUIZ-001';
      const studentId = studentInfo?.id || 'GUEST-USER';
      const qrData = `https://openprep.ai/quiz/${quizId}?std=${studentId}`;
      const qrBuffer = await QRCode.toBuffer(qrData, { type: 'png', margin: 1, width: 70 });
      doc.image(qrBuffer, 480, 50, { width: 70, height: 70 });

      // 3. Header Text
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(18).text('OpenPrep AI', 60, 55);
      doc.fillColor('#64748B').font('Helvetica').fontSize(11).text('Official Offline Examination OMR Bubble Sheet', 60, 75);

      // 4. Student Metadata Block
      const questionsCount = quizData?.questions?.length || 40;
      doc.rect(60, 110, 400, 65).lineWidth(1).stroke('#CBD5E1').fill('#F8FAFC');
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(10);
      doc.text(`STUDENT NAME: ___________________________`, 75, 122);
      doc.text(`STUDENT ID:   ${studentId}`, 75, 145);
      doc.text(`EXAM CODE: ${quizData?.examCode || 'NEET-2026-A1'}`, 280, 122);
      doc.text(`QUESTIONS: ${questionsCount}`, 280, 145);

      // 5. Dynamic Grid Render Loop matching Question Count
      const startY = 200;
      const bubbleRadius = 7;
      const rowHeight = 22;
      const options = ['A', 'B', 'C', 'D'];
      const questionsList = quizData?.questions && quizData.questions.length > 0
        ? quizData.questions
        : new Array(questionsCount).fill({});

      const halfLength = Math.ceil(questionsList.length / 2);

      questionsList.forEach((_, index) => {
        const isRightCol = index >= halfLength;
        const colX = isRightCol ? 310 : 80;
        const normalizedIdx = isRightCol ? index - halfLength : index;
        const currentY = startY + (normalizedIdx * rowHeight);

        if (currentY + rowHeight > 780) return; // Stay within A4 printable boundary

        // Question Tag
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(10).text(`${String(index + 1).padStart(2, '0')}.`, colX, currentY + 3);

        // Render Bubble Row (A, B, C, D)
        options.forEach((opt, optIdx) => {
          const bubbleX = colX + 35 + (optIdx * 26);
          doc.circle(bubbleX, currentY + 6, bubbleRadius).lineWidth(1).stroke('#475569');
          doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(opt, bubbleX - 3.5, currentY + 3.5);
        });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function generateAnswerKey(quizData) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 36, bottom: 36, left: 36, right: 36 } });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(18).text('OpenPrep AI - Examiner Answer Key', 50, 50);
      doc.fillColor('#64748B').font('Helvetica').fontSize(11).text(`Exam Code: ${quizData?.examCode || 'NEET-2026-A1'} | Quiz ID: ${quizData?.id || 'QUIZ-001'}`, 50, 75);

      const questionsList = quizData?.questions && quizData.questions.length > 0 ? quizData.questions : [
        { question: 'Sample Question 1', correctAnswer: 'A', explanation: 'Option A is correct due to system entropy rules.' }
      ];

      let currentY = 110;
      questionsList.forEach((q, idx) => {
        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }

        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text(`Q${idx + 1}: ${q.question || `Question ${idx + 1}`}`, 50, currentY);
        currentY += 18;

        const correct = q.correctAnswer || 'A';
        doc.fillColor('#059669').font('Helvetica-Bold').fontSize(10).text(`Correct Answer: (${correct})`, 65, currentY);
        currentY += 16;

        if (q.explanation) {
          doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9).text(`Explanation: ${q.explanation}`, 65, currentY, { width: 480 });
          currentY += 24;
        } else {
          currentY += 8;
        }
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateOmrSheet, generateAnswerKey };
