const { generateChapterWiseNotesPdf, generateExamPdf } = require('../../services/pdfExportService');

describe('pdfExportService Unit Tests', () => {
  const sampleChapters = [
    {
      title: 'Chapter 1: Kinematics & Forces',
      subjectName: 'Physics',
      topicName: 'Kinematics',
      notes: [
        {
          id: 'note-1',
          title: 'Newton\'s Second Law',
          content: 'The acceleration of an object as produced by a net force is directly proportional to the magnitude of the net force.',
          category: 'Lecture Notes',
          tags: ['physics', 'mechanics', 'forces'],
          aiSummary: {
            summary: 'F = ma governs the relationship between mass, acceleration, and net force.',
            keyTakeaways: ['F = ma', 'Units in Newtons (N)'],
          },
        },
      ],
    },
    {
      title: 'Chapter 2: Energy & Work',
      subjectName: 'Physics',
      topicName: 'Work-Energy Theorem',
      notes: [
        {
          id: 'note-2',
          title: 'Kinetic and Potential Energy',
          content: 'Work done equals change in kinetic energy. E_k = 1/2 m v^2.',
          category: 'Study Guide',
          tags: ['energy', 'work'],
        },
      ],
    },
  ];

  const exportOptions = {
    title: 'Physics Master Study Notes',
    studentName: 'Rushabh Mahajan',
    userEmail: 'rushabh@openprep.ai',
    userId: 'user-uuid-1',
    institution: 'OpenPrep AI Academy',
    includeToc: true,
    includeSignature: true,
    watermarkText: 'CONFIDENTIAL PREPARATION MATERIAL',
    watermarkOpacity: 0.08,
  };

  it('should generate a valid binary PDF buffer for chapter-wise study notes', async () => {
    const pdfBuffer = await generateChapterWiseNotesPdf(sampleChapters, exportOptions);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic bytes header check '%PDF-'
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('should generate PDF when chapters array is empty', async () => {
    const pdfBuffer = await generateChapterWiseNotesPdf([], exportOptions);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('should execute generateExamPdf successfully', async () => {
    const quizData = {
      title: 'Quick Quiz Exam Sheet',
      questions: [
        { text: 'What is the SI unit of force?', options: ['Newton', 'Joule', 'Watt'], correctAnswer: 'Newton' },
      ],
    };

    const pdfBuffer = await generateExamPdf(quizData, { studentName: 'Test Student' });
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
