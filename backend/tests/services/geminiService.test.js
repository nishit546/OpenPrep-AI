const geminiService = require('../../services/geminiService');
const { validateResponse, RESPONSE_SCHEMAS } = geminiService;

describe('Gemini Service - Mock Fallbacks', () => {
  beforeAll(() => {
    // Ensure no GEMINI_API_KEY is set so mock data is used
    delete process.env.GEMINI_API_KEY;
  });

  describe('analyzePYQText', () => {
    it('should return mock PYQ analysis when API key is not configured', async () => {
      const result = await geminiService.analyzePYQText('some exam text', 'Computer Science');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('chapterWeightage');
      expect(result).toHaveProperty('importantTopics');
      expect(result).toHaveProperty('repeatedQuestions');
      expect(result).toHaveProperty('trendAnalysis');

      expect(Array.isArray(result.chapterWeightage)).toBe(true);
      expect(Array.isArray(result.importantTopics)).toBe(true);
      expect(Array.isArray(result.repeatedQuestions)).toBe(true);
      expect(typeof result.trendAnalysis).toBe('string');

      expect(result.trendAnalysis).toContain('Computer Science');
    });

    it('should return chapter weightage with valid structure', async () => {
      const result = await geminiService.analyzePYQText('text', 'Math');
      const item = result.chapterWeightage[0];
      expect(item).toHaveProperty('chapterName');
      expect(item).toHaveProperty('weightage');
      expect(typeof item.weightage).toBe('number');
    });

    it('should return important topics with valid importance levels', async () => {
      const result = await geminiService.analyzePYQText('text', 'Physics');
      const validImportance = ['High', 'Medium', 'Low'];
      result.importantTopics.forEach((topic) => {
        expect(validImportance).toContain(topic.importance);
      });
    });

    it('should return repeated questions with year arrays', async () => {
      const result = await geminiService.analyzePYQText('text', 'Chemistry');
      result.repeatedQuestions.forEach((q) => {
        expect(q).toHaveProperty('questionText');
        expect(q).toHaveProperty('years');
        expect(Array.isArray(q.years)).toBe(true);
        expect(q.years.length).toBeGreaterThan(0);
        expect(typeof q.years[0]).toBe('number');
      });
    });
  });

  describe('generateStudyPlan', () => {
    it('should return mock study plan when API key is not configured', async () => {
      const subjects = [{ subjectName: 'Math', topics: ['Algebra', 'Geometry'] }];
      const result = await geminiService.generateStudyPlan(
        'Final Exam',
        subjects,
        '2026-06-01',
        '2026-06-10',
        3
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit mock study plan to 7 days maximum', async () => {
      const subjects = [{ subjectName: 'Math', topics: ['Algebra'] }];
      const result = await geminiService.generateStudyPlan(
        'Exam',
        subjects,
        '2026-01-01',
        '2026-01-31',
        3
      );

      expect(result.length).toBeLessThanOrEqual(7);
    });

    it('should return daily goals with date and tasks', async () => {
      const subjects = [{ subjectName: 'History', topics: ['WWII'] }];
      const result = await geminiService.generateStudyPlan(
        'Test',
        subjects,
        '2026-06-01',
        '2026-06-03',
        2
      );

      expect(result.length).toBeGreaterThan(0);
      const day = result[0];
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('tasks');
      expect(Array.isArray(day.tasks)).toBe(true);
      expect(day.tasks.length).toBeGreaterThan(0);

      const task = day.tasks[0];
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('duration');
      expect(task).toHaveProperty('topicName');
    });
  });

  describe('generateQuiz', () => {
    it('should return mock quiz when API key is not configured', async () => {
      const result = await geminiService.generateQuiz('Math', 'Algebra', '', 5);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('questions');
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('should localize mock quiz content for Hindi requests', async () => {
      const result = await geminiService.generateQuiz('Math', 'Algebra', '', 2, false, 'hindi');

      expect(result.questions[0].questionText).toContain('हिंदी');
      expect(result.questions[0].explanation).toContain('हिंदी');
    });

    it('should return the requested number of questions', async () => {
      const result = await geminiService.generateQuiz('Science', 'Physics', '', 3);

      expect(result.questions.length).toBe(3);
    });

    it('should return questions with valid structure', async () => {
      const result = await geminiService.generateQuiz('CS', 'Algorithms', '', 1);

      const question = result.questions[0];
      expect(question).toHaveProperty('questionText');
      expect(question).toHaveProperty('options');
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBe(4);
      expect(question).toHaveProperty('correctAnswer');
      expect(typeof question.correctAnswer).toBe('number');
      expect(question).toHaveProperty('explanation');
      expect(typeof question.explanation).toBe('string');
    });
  });

  describe('generateFlashcards', () => {
    it('should return mock flashcards when API key is not configured', async () => {
      const result = await geminiService.generateFlashcards('Biology', 'Cell Division', '', 4);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return the requested number of flashcards', async () => {
      const result = await geminiService.generateFlashcards('Chem', 'Periodic Table', '', 2);

      expect(result.length).toBe(2);
    });

    it('should return flashcards with front and back properties', async () => {
      const result = await geminiService.generateFlashcards('Physics', 'Newton Laws', '', 1);

      const card = result[0];
      expect(card).toHaveProperty('front');
      expect(card).toHaveProperty('back');
      expect(typeof card.front).toBe('string');
      expect(typeof card.back).toBe('string');

      expect(card.front).toContain('Newton Laws');
    });
  });

  describe('analyzePerformanceAndRecommend', () => {
    it('should return mock recommendations when API key is not configured', async () => {
      const attempts = [{ score: 80, subject: 'Math' }];
      const result = await geminiService.analyzePerformanceAndRecommend(attempts);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('weakSubjects');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.weakSubjects)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should return recommendations with valid priority levels', async () => {
      const attempts = [{ score: 50, subject: 'CS' }];
      const result = await geminiService.analyzePerformanceAndRecommend(attempts);

      const validPriorities = ['High', 'Medium', 'Low'];
      result.recommendations.forEach((rec) => {
        expect(rec).toHaveProperty('subject');
        expect(rec).toHaveProperty('topic');
        expect(rec).toHaveProperty('suggestion');
        expect(rec).toHaveProperty('priority');
        expect(validPriorities).toContain(rec.priority);
      });
    });
  });

  // =========================================================================
  // validateResponse — nested item shape validation
  // =========================================================================
  describe('validateResponse (nested item validation)', () => {
    describe('pyqAnalysis schema', () => {
      const schema = RESPONSE_SCHEMAS.pyqAnalysis;

      it('should accept a fully valid pyqAnalysis payload', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms', weightage: 40 }],
          importantTopics: [{ topicName: 'Sorting', importance: 'High', frequency: 5 }],
          repeatedQuestions: [{ questionText: 'What is X?', years: [2020, 2021] }],
          trendAnalysis: 'The exam focuses on practical questions.',
        };
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject when importantTopics item has no topicName', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms', weightage: 40 }],
          importantTopics: [{ importance: 'High', frequency: 5 }], // missing topicName
          repeatedQuestions: [{ questionText: 'What is X?', years: [2020] }],
          trendAnalysis: 'Trend text',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });

      it('should reject when importantTopics item has wrong type for frequency', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms', weightage: 40 }],
          importantTopics: [{ topicName: 'Sorting', importance: 'High', frequency: 'five' }], // string instead of number
          repeatedQuestions: [{ questionText: 'What is X?', years: [2020] }],
          trendAnalysis: 'Trend text',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });

      it('should reject when chapterWeightage item has no weightage', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms' }], // missing weightage
          importantTopics: [{ topicName: 'Sorting', importance: 'High', frequency: 5 }],
          repeatedQuestions: [{ questionText: 'What is X?', years: [2020] }],
          trendAnalysis: 'Trend text',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });

      it('should reject when repeatedQuestions item has non-array years', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms', weightage: 40 }],
          importantTopics: [{ topicName: 'Sorting', importance: 'High', frequency: 5 }],
          repeatedQuestions: [{ questionText: 'What is X?', years: '2020,2021' }], // string instead of array
          trendAnalysis: 'Trend text',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });

      it('should reject null data', () => {
        expect(validateResponse(null, schema)).toBe(false);
      });

      it('should reject when importantTopics is empty array', () => {
        const data = {
          chapterWeightage: [{ chapterName: 'Algorithms', weightage: 40 }],
          importantTopics: [],
          repeatedQuestions: [{ questionText: 'What is X?', years: [2020] }],
          trendAnalysis: 'Trend text',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });
    });

    describe('quiz schema', () => {
      const schema = RESPONSE_SCHEMAS.quiz;

      it('should accept a fully valid quiz payload', () => {
        const data = {
          title: 'Sample Quiz',
          questions: [
            { questionText: 'What is 2+2?', options: ['1', '2', '3', '4'], correctAnswer: 3, explanation: '2+2=4' },
          ],
        };
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject when a question has no correctAnswer', () => {
        const data = {
          title: 'Bad Quiz',
          questions: [
            { questionText: 'What is 2+2?', options: ['1', '2', '3', '4'], explanation: '2+2=4' }, // missing correctAnswer
          ],
        };
        expect(validateResponse(data, schema)).toBe(false);
      });

      it('should reject when a question has non-array options', () => {
        const data = {
          title: 'Bad Quiz',
          questions: [
            { questionText: 'What is 2+2?', options: '1,2,3,4', correctAnswer: 3, explanation: '2+2=4' }, // string instead of array
          ],
        };
        expect(validateResponse(data, schema)).toBe(false);
      });
    });

    describe('performance schema', () => {
      const schema = RESPONSE_SCHEMAS.performance;

      it('should accept a fully valid performance payload', () => {
        const data = {
          weakSubjects: ['Math'],
          recommendations: [
            { subject: 'Math', topic: 'Algebra', suggestion: 'Practice more', priority: 'High' },
          ],
        };
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should accept weakSubjects as array of strings', () => {
        const data = {
          weakSubjects: ['Math', 'Science'],
          recommendations: [{ subject: 'Math', topic: 'Algebra', suggestion: 'Practice more', priority: 'High' }],
        };
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject when a recommendation has no subject', () => {
        const data = {
          weakSubjects: ['Math'],
          recommendations: [
            { topic: 'Algebra', suggestion: 'Practice more', priority: 'High' }, // missing subject
          ],
        };
        expect(validateResponse(data, schema)).toBe(false);
      });
    });

    describe('studyPlan schema (top-level array)', () => {
      const schema = RESPONSE_SCHEMAS.studyPlan;

      it('should accept a valid study plan array', () => {
        const data = [
          { date: '2026-06-01', tasks: [{ title: 'Study', duration: 60, topicName: 'Math' }] },
        ];
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject a study plan with missing date', () => {
        const data = [
          { tasks: [{ title: 'Study', duration: 60, topicName: 'Math' }] }, // missing date
        ];
        expect(validateResponse(data, schema)).toBe(false);
      });
    });

    describe('flashcard schema (top-level array)', () => {
      const schema = RESPONSE_SCHEMAS.flashcard;

      it('should accept a valid flashcard array', () => {
        const data = [{ front: 'Question?', back: 'Answer.' }];
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject a flashcard with missing back', () => {
        const data = [{ front: 'Question?' }]; // missing back
        expect(validateResponse(data, schema)).toBe(false);
      });
    });

    describe('pyqForecasting schema', () => {
      const schema = RESPONSE_SCHEMAS.pyqForecasting;

      it('should accept a fully valid forecasting payload', () => {
        const data = {
          predictedDifficulty: 'Medium',
          expectedEasyPercent: 30,
          expectedMediumPercent: 50,
          expectedHardPercent: 20,
          topicTrends: [
            { topicName: 'Topic A', expectedProbability: 80, trendStatus: 'Rising Weightage' },
          ],
          recommendedFocusAreas: ['Focus A'],
          revisionStrategy: 'Strategy A',
        };
        expect(validateResponse(data, schema)).toBe(true);
      });

      it('should reject when predictedDifficulty is missing', () => {
        const data = {
          expectedEasyPercent: 30,
          expectedMediumPercent: 50,
          expectedHardPercent: 20,
          topicTrends: [
            { topicName: 'Topic A', expectedProbability: 80, trendStatus: 'Rising Weightage' },
          ],
          recommendedFocusAreas: ['Focus A'],
          revisionStrategy: 'Strategy A',
        };
        expect(validateResponse(data, schema)).toBe(false);
      });
    });
  });

  describe('predictUpcomingExamTrends Method', () => {
    it('should fall back to mock forecasting when genAI is not configured', async () => {
      const forecast = await geminiService.predictUpcomingExamTrends('Math', []);
      expect(forecast).toBeDefined();
      expect(forecast.predictedDifficulty).toBe('Medium');
      expect(forecast.topicTrends.length).toBeGreaterThan(0);
    });
  });
});
