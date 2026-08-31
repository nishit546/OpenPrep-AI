const burnoutPreventionService = require('../../services/burnoutPreventionService');
const ActivityLog = require('../../models/ActivityLog');

// ── Mocks ───────────────────────────────────────────────────────────────
jest.mock('../../services/burnoutPreventionService');
jest.mock('../../models/ActivityLog');

const mockReq = (overrides = {}) => ({
  user: { id: 'user-123' },
  body: {},
  query: {},
  params: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// ── Tests ───────────────────────────────────────────────────────────────
describe('burnoutPreventionController', () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = require('../../controllers/burnoutPreventionController');
  });

  describe('submitAssessment', () => {
    it('should return 400 if stressLevel is missing', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await controller.submitAssessment(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 400 if stressLevel is out of range', async () => {
      const req = mockReq({ body: { stressLevel: 15 } });
      const res = mockRes();

      await controller.submitAssessment(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create an assessment and return 201', async () => {
      const mockAssessment = {
        id: 'assessment-1',
        riskScore: 42,
        riskCategory: 'elevated',
        riskFactors: [],
        recommendations: [],
      };

      burnoutPreventionService.performAssessment.mockResolvedValue(mockAssessment);
      ActivityLog.create.mockResolvedValue({});

      const req = mockReq({
        body: {
          stressLevel: 7,
          studyHoursLast24h: 6,
          sleepQuality: 5,
          motivationLevel: 6,
          fatigueLevel: 5,
          socialIsolationDays: 1,
        },
      });
      const res = mockRes();

      await controller.submitAssessment(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssessment,
      });
      expect(burnoutPreventionService.performAssessment).toHaveBeenCalledWith('user-123', {
        stressLevel: 7,
        studyHoursLast24h: 6,
        sleepQuality: 5,
        motivationLevel: 6,
        fatigueLevel: 5,
        socialIsolationDays: 1,
        notes: undefined,
      });
      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user-123',
          activityType: 'burnout_assessment',
        })
      );
    });
  });

  describe('getRiskSummary', () => {
    it('should return the risk summary', async () => {
      const mockSummary = {
        currentRisk: { score: 30, category: 'moderate' },
        trend: { direction: 'stable', delta: 0, averageScore30d: 28, assessmentCount30d: 5 },
        categoryDistribution: { low: 2, moderate: 3, elevated: 0, high: 0, critical: 0 },
        riskLevelDescription: 'Your burnout risk is low but present.',
      };

      burnoutPreventionService.getRiskSummary.mockResolvedValue(mockSummary);

      const req = mockReq();
      const res = mockRes();

      await controller.getRiskSummary(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe('getAssessmentHistory', () => {
    it('should return paginated history', async () => {
      const mockResult = {
        assessments: [{ id: 'a1' }, { id: 'a2' }],
        pagination: { total: 2, page: 1, limit: 20, pages: 1 },
      };

      burnoutPreventionService.getAssessmentHistory.mockResolvedValue(mockResult);

      const req = mockReq({ query: { page: '1', limit: '20' } });
      const res = mockRes();

      await controller.getAssessmentHistory(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
          total: 2,
          data: mockResult.assessments,
        })
      );
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations when assessment exists', async () => {
      burnoutPreventionService.getRiskSummary.mockResolvedValue({
        currentRisk: {
          score: 55,
          category: 'high',
          riskFactors: [{ factor: 'extreme_stress', severity: 'high' }],
          recommendations: [{ type: 'urgent_rest', title: 'Take a Break' }],
        },
      });

      const req = mockReq();
      const res = mockRes();

      await controller.getRecommendations(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.hasAssessment).toBe(true);
      expect(response.data.recommendations).toHaveLength(1);
    });

    it('should return guidance when no assessment exists', async () => {
      burnoutPreventionService.getRiskSummary.mockResolvedValue({
        currentRisk: null,
        trend: { direction: 'stable', averageScore30d: 0, assessmentCount30d: 0 },
      });

      const req = mockReq();
      const res = mockRes();

      await controller.getRecommendations(req, res, mockNext);

      const response = res.json.mock.calls[0][0];
      expect(response.data.hasAssessment).toBe(false);
      expect(response.data.message).toContain('first assessment');
    });
  });

  describe('getRiskTrend', () => {
    it('should return trend data for the last 30 days', async () => {
      const mockTrendData = [
        { date: '2026-08-01', riskScore: 25, riskCategory: 'moderate' },
        { date: '2026-08-15', riskScore: 45, riskCategory: 'elevated' },
      ];

      const { BurnoutAssessment } = require('../../models');
      jest.spyOn(BurnoutAssessment, 'findAll').mockResolvedValue(
        mockTrendData.map((d) => ({
          ...d,
          stressLevel: 6,
          motivationLevel: 5,
          fatigueLevel: 5,
          createdAt: new Date(d.date),
        }))
      );

      const req = mockReq({ query: { days: '30' } });
      const res = mockRes();

      await controller.getRiskTrend(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data).toHaveLength(2);
    });
  });

  describe('getDailyCheckin', () => {
    it('should return check-in prompt when not yet assessed today', async () => {
      burnoutPreventionService.getRiskSummary.mockResolvedValue({
        trend: { direction: 'stable', averageScore30d: 30, assessmentCount30d: 5 },
        riskLevelDescription: 'Your burnout risk is low.',
      });
      burnoutPreventionService.calculateConsecutiveStudyDays.mockResolvedValue(3);

      const { BurnoutAssessment } = require('../../models');
      jest.spyOn(BurnoutAssessment, 'findOne').mockResolvedValue(null);

      const req = mockReq();
      const res = mockRes();

      await controller.getDailyCheckin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.alreadyAssessedToday).toBe(false);
      expect(response.data.prompt).toContain('How are you feeling');
    });
  });

  describe('getDashboard', () => {
    it('should return the full dashboard overview', async () => {
      burnoutPreventionService.getRiskSummary.mockResolvedValue({
        currentRisk: {
          score: 35,
          category: 'elevated',
          riskFactors: [],
          recommendations: [],
        },
        trend: { direction: 'worsening', delta: 12, averageScore30d: 28, assessmentCount30d: 10 },
        categoryDistribution: { low: 3, moderate: 4, elevated: 2, high: 1, critical: 0 },
        riskLevelDescription: 'Warning — your burnout risk is climbing.',
      });

      const { BurnoutAssessment } = require('../../models');
      jest.spyOn(BurnoutAssessment, 'findAll').mockResolvedValue([
        { riskScore: 20, createdAt: new Date() },
        { riskScore: 35, createdAt: new Date() },
      ]);

      const req = mockReq();
      const res = mockRes();

      await controller.getDashboard(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.wellnessScore).toBe(65);
      expect(response.data.balanceIndicator).toBe('imbalanced');
      expect(response.data.weeklyRiskScores).toHaveLength(2);
    });
  });
});
