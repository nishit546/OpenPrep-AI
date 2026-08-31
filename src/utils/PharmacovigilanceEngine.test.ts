/**
 * Unit & Integration Test Suite for Pharmacovigilance Engine
 * Tests contingency table construction, PRR/ROR calculation, BCPNN Information Component approximation,
 * and drug safety profile generation.
 * DO NOT EXECUTE THIS FILE IN CI/CD OR LOCAL ENVIRONMENT AS PER TASK INSTRUCTIONS.
 */

import { PharmacovigilanceEngine, AdverseEventReport } from '../utils/PharmacovigilanceEngine';

describe('PharmacovigilanceEngine Unit Test Suite', () => {
  const mockReports: AdverseEventReport[] = [
    { reportId: 'R-1', drugName: 'DrugA', adverseEventTerm: 'EventX', reactionSeverity: 'SEVERE', patientAgeGroup: 'ADULT', reporterType: 'PHYSICIAN', reportedAt: '2026-01-01', isConfirmedByLab: true },
    { reportId: 'R-2', drugName: 'DrugA', adverseEventTerm: 'EventX', reactionSeverity: 'SEVERE', patientAgeGroup: 'ADULT', reporterType: 'PHYSICIAN', reportedAt: '2026-01-02', isConfirmedByLab: true },
    { reportId: 'R-3', drugName: 'DrugA', adverseEventTerm: 'EventX', reactionSeverity: 'LIFE_THREATENING', patientAgeGroup: 'GERIATRIC', reporterType: 'PHYSICIAN', reportedAt: '2026-01-03', isConfirmedByLab: true },
    { reportId: 'R-4', drugName: 'DrugA', adverseEventTerm: 'EventY', reactionSeverity: 'MILD', patientAgeGroup: 'ADULT', reporterType: 'PATIENT', reportedAt: '2026-01-04', isConfirmedByLab: false },
    { reportId: 'R-5', drugName: 'DrugB', adverseEventTerm: 'EventX', reactionSeverity: 'MODERATE', patientAgeGroup: 'PEDIATRIC', reporterType: 'PHARMACIST', reportedAt: '2026-01-05', isConfirmedByLab: true },
    { reportId: 'R-6', drugName: 'DrugB', adverseEventTerm: 'EventZ', reactionSeverity: 'MILD', patientAgeGroup: 'ADULT', reporterType: 'PATIENT', reportedAt: '2026-01-06', isConfirmedByLab: false },
  ];

  test('should accurately compute 2x2 contingency table for DrugA and EventX', () => {
    const engine = new PharmacovigilanceEngine(mockReports);
    const table = engine.calculateContingencyTable('DrugA', 'EventX');

    // DrugA & EventX = 3 (R-1, R-2, R-3)
    expect(table.a).toBe(3);
    // DrugA & Not EventX = 1 (R-4)
    expect(table.b).toBe(1);
    // Not DrugA & EventX = 1 (R-5)
    expect(table.c).toBe(1);
    // Not DrugA & Not EventX = 1 (R-6)
    expect(table.d).toBe(1);
  });

  test('should identify strong signal status when PRR and IC thresholds are met', () => {
    const engine = new PharmacovigilanceEngine(mockReports);
    const metrics = engine.evaluateSignalMetrics('DrugA', 'EventX');

    expect(metrics.coOccurrenceCount).toBe(3);
    expect(metrics.proportionalReportingRatio).toBeGreaterThanOrEqual(1.5);
    expect(metrics.reportingOddsRatio).toBeGreaterThan(0);
    expect(metrics.signalStatus).toBe('STRONG_SIGNAL');
  });

  test('should return NO_SIGNAL for non-existent drug-event co-occurrences', () => {
    const engine = new PharmacovigilanceEngine(mockReports);
    const metrics = engine.evaluateSignalMetrics('DrugA', 'NonExistentEvent');

    expect(metrics.coOccurrenceCount).toBe(0);
    expect(metrics.proportionalReportingRatio).toBe(0);
    expect(metrics.signalStatus).toBe('NO_SIGNAL');
  });

  test('should generate comprehensive Drug Safety Profile for DrugA', () => {
    const engine = new PharmacovigilanceEngine(mockReports);
    const profile = engine.generateDrugSafetyProfile('DrugA');

    expect(profile.drugName).toBe('DrugA');
    expect(profile.totalReportsCount).toBe(4);
    expect(profile.topAdverseEvents.length).toBe(2);
    expect(profile.topAdverseEvents[0].term).toBe('EventX');
    expect(profile.highRiskDemographic).toBe('ADULT');
    expect(profile.overallSafetyRiskScore).toBeGreaterThan(0);
  });
});
