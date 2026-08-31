/**
 * Unit & Integration Test Suite for Perioperative Anesthesia Engine
 * Tests Mallampati airway classification, Revised Cardiac Risk Index (RCRI), and STOP-Bang OSA score logic.
 * DO NOT EXECUTE THIS FILE IN CI/CD OR LOCAL ENVIRONMENT AS PER TASK INSTRUCTIONS.
 */

import { PerioperativeAnesthesiaEngine, PatientPreopAssessment } from '../utils/PerioperativeAnesthesiaEngine';

describe('PerioperativeAnesthesiaEngine Unit Test Suite', () => {
  const mockAssessment: PatientPreopAssessment = {
    patientId: 'PT-TEST-001',
    ageYears: 65,
    asaClass: 3,
    isEmergencyProcedure: false,
    mallampatiScore: 3,
    mouthOpeningCm: 2.8,
    thyromentalDistanceCm: 5.5,
    hasHighRiskSurgery: true,
    hasHistoryIschemicHeartDisease: true,
    hasHistoryCongestiveHeartFailure: false,
    hasHistoryCerebrovascularDisease: false,
    preopSerumCreatinineMgDl: 1.4,
    isInsulinDependentDiabetes: true,
    snoringHeavy: true,
    tiredDaytime: true,
    observedApnea: true,
    highBloodPressure: true,
    bmi: 36,
    neckCircumferenceCm: 42,
  };

  test('should predict difficult airway for Mallampati 3 and restricted mouth opening', () => {
    const engine = new PerioperativeAnesthesiaEngine(mockAssessment);
    const airway = engine.evaluateAirway();

    expect(airway.mallampatiScore).toBe(3);
    expect(airway.isDifficultAirwayPredicted).toBe(true);
    expect(airway.recommendedEquipment).toContain('Video Laryngoscope (GlideScope)');
  });

  test('should compute correct RCRI score and cardiac MACE risk percentage', () => {
    const engine = new PerioperativeAnesthesiaEngine(mockAssessment);
    const cardiac = engine.evaluateCardiacRisk();

    // High risk surgery (1) + Ischemic Heart Disease (1) + Insulin Dependent Diabetes (1) = 3
    expect(cardiac.rcriScore).toBe(3);
    expect(cardiac.cardiacRiskPercent).toBe(11.0);
    expect(cardiac.cardiacRiskTier).toBe('CLASS_IV_VERY_HIGH');
  });

  test('should compute STOP-Bang score and classify high-risk OSA', () => {
    const engine = new PerioperativeAnesthesiaEngine(mockAssessment);
    const osa = engine.evaluateOSARisk();

    expect(osa.stopBangScore).toBeGreaterThanOrEqual(5);
    expect(osa.osaRiskCategory).toBe('HIGH_RISK_OSA');
  });

  test('should generate full perioperative report with specialized anesthetic plan recommendation', () => {
    const engine = new PerioperativeAnesthesiaEngine(mockAssessment);
    const report = engine.generateReport();

    expect(report.patientId).toBe('PT-TEST-001');
    expect(report.asaPhysicalStatusLabel).toContain('ASA III');
    expect(report.anestheticPlanRecommendation).toBeDefined();
  });
});
