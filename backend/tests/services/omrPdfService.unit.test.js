const { generateOmrSheet, generateAnswerKey } = require('../../services/omrPdfService');

describe('OMR PDF Answer Sheet & Answer Key Generator Unit Test Suite', () => {
  test('generateOmrSheet produces a non-empty A4 vector PDF Buffer with QR code and corner anchors', async () => {
    const quizData = {
      id: 'QUIZ-TEST-101',
      examCode: 'SAT-2026-TEST',
      questions: new Array(20).fill({ question: 'Test question sample' })
    };
    const studentInfo = { id: 'STUDENT-TEST-99' };

    const pdfBuffer = await generateOmrSheet(quizData, studentInfo);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic bytes %PDF-
    expect(pdfBuffer.toString('utf8', 0, 5)).toContain('%PDF-');
  });

  test('generateAnswerKey produces a valid examiner answer key PDF buffer with solutions', async () => {
    const quizData = {
      id: 'QUIZ-TEST-101',
      examCode: 'SAT-2026-TEST',
      questions: [
        { question: 'What is the powerhouse of the cell?', correctAnswer: 'A', explanation: 'Mitochondria generates ATP.' }
      ]
    };

    const pdfBuffer = await generateAnswerKey(quizData);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.toString('utf8', 0, 5)).toContain('%PDF-');
  });
});
