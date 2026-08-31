/**
 * Unit & Integration Test Suite for Oncology Chemotherapy Engine
 * Tests Mosteller BSA calculation, Cockcroft-Gault CrCl, Calvert AUC dosing, and CTCAE toxicity dose reductions.
 * DO NOT EXECUTE THIS FILE IN CI/CD OR LOCAL ENVIRONMENT AS PER TASK INSTRUCTIONS.
 */

import { OncologyChemotherapyEngine, PatientOncologyProfile, CTCAEToxicityGrade } from '../utils/OncologyChemotherapyEngine';

describe('OncologyChemotherapyEngine Unit Test Suite', () => {
  const mockPatient: PatientOncologyProfile = {
    patientId: 'PT-TEST-001',
    weightKg: 70,
    heightCm: 170,
    serumCreatinineMgDl: 1.0,
    gender: 'FEMALE',
    ageYears: 60,
    cancerType: 'OVARIAN',
  };

  test('should accurately calculate Body Surface Area (BSA) via Mosteller formula', () => {
    const engine = new OncologyChemotherapyEngine(mockPatient);
    // sqrt((170 * 70) / 3600) = sqrt(11900 / 3600) = sqrt(3.3055) ≈ 1.82 m²
    expect(engine.calculateBSA()).toBeCloseTo(1.82, 1);
  });

  test('should accurately compute Cockcroft-Gault CrCl for female patient', () => {
    const engine = new OncologyChemotherapyEngine(mockPatient);
    // ((140 - 60) * 70) / (72 * 1.0) * 0.85 = (5600 / 72) * 0.85 = 77.77 * 0.85 ≈ 66.1 mL/min
    expect(engine.calculateCockcroftGaultCrCl()).toBeGreaterThan(60);
    expect(engine.calculateCockcroftGaultCrCl()).toBeLessThan(75);
  });

  test('should calculate Calvert AUC dose correctly for Carboplatin', () => {
    const engine = new OncologyChemotherapyEngine(mockPatient);
    const crcl = engine.calculateCockcroftGaultCrCl();
    const targetAUC = 5;
    const expectedDose = Math.round(targetAUC * (crcl + 25));

    expect(engine.calculateCalvertDose(targetAUC)).toBe(expectedDose);
  });

  test('should recommend 25% dose reduction for Grade 3 toxicity', () => {
    const grade3Toxicities: CTCAEToxicityGrade[] = [
      { toxicityCategory: 'NEUTROPENIA', currentGrade: 3, clinicalDescription: 'Grade 3 Neutropenia' },
    ];

    const engine = new OncologyChemotherapyEngine(mockPatient, grade3Toxicities);
    const safety = engine.evaluateRegimenSafety();

    expect(safety.maxToxicityGrade).toBe(3);
    expect(safety.isDoseReductionRequired).toBe(true);
    expect(safety.recommendedDoseAdjustmentPercent).toBe(25);
    expect(safety.gcsfProphylaxisIndicated).toBe(true);
  });

  test('should recommend 50% dose reduction for Grade 4 toxicity', () => {
    const grade4Toxicities: CTCAEToxicityGrade[] = [
      { toxicityCategory: 'NEPHROTOXICITY', currentGrade: 4, clinicalDescription: 'Grade 4 Nephrotoxicity' },
    ];

    const engine = new OncologyChemotherapyEngine(mockPatient, grade4Toxicities);
    const safety = engine.evaluateRegimenSafety();

    expect(safety.maxToxicityGrade).toBe(4);
    expect(safety.isDoseReductionRequired).toBe(true);
    expect(safety.recommendedDoseAdjustmentPercent).toBe(50);
    expect(safety.gcsfProphylaxisIndicated).toBe(true);
  });
});
