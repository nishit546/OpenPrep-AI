/**
 * Unit & Integration Test Suite for Pediatric Dosing Engine
 * Tests WHO growth percentile Z-scores, weight-based mg/kg calculations, and adult dose cap enforcement.
 * DO NOT EXECUTE THIS FILE IN CI/CD OR LOCAL ENVIRONMENT AS PER TASK INSTRUCTIONS.
 */

import { PediatricDosingEngine, PediatricPatientProfile } from '../utils/PediatricDosingEngine';

describe('PediatricDosingEngine Unit Test Suite', () => {
  const mockChild: PediatricPatientProfile = {
    patientId: 'CHILD-TEST-001',
    gender: 'MALE',
    ageMonths: 24,
    weightKg: 12.0,
    heightCm: 85,
  };

  test('should accurately evaluate growth Z-scores and categorize growth status as NORMAL', () => {
    const engine = new PediatricDosingEngine(mockChild);
    const growth = engine.evaluateGrowthZScores();

    expect(growth.weightForAgeZScore).toBeDefined();
    expect(growth.heightForAgeZScore).toBeDefined();
    expect(growth.weightForAgePercentile).toBeGreaterThan(0);
    expect(growth.weightForAgePercentile).toBeLessThan(100);
    expect(growth.growthStatus).toBe('NORMAL');
  });

  test('should compute accurate weight-based single dose without exceeding adult cap', () => {
    const engine = new PediatricDosingEngine(mockChild);
    // 15 mg/kg * 12 kg = 180 mg
    const dose = engine.calculateMedicationDose('Acetaminophen', 'Fever', 15, 4, 1000);

    expect(dose.calculatedSingleDoseMg).toBe(180);
    expect(dose.finalSafeSingleDoseMg).toBe(180);
    expect(dose.isExceedingAdultCap).toBe(false);
  });

  test('should enforce adult dose cap when calculated mg/kg dose exceeds maximum adult single dose', () => {
    const heavyChild: PediatricPatientProfile = {
      patientId: 'CHILD-HEAVY-002',
      gender: 'MALE',
      ageMonths: 120, // 10 years old
      weightKg: 55.0, // 55 kg
      heightCm: 140,
    };

    const engine = new PediatricDosingEngine(heavyChild);
    // 15 mg/kg * 55 kg = 825 mg (Adult cap is 500 mg for this test scenario)
    const dose = engine.calculateMedicationDose('TestDrug', 'Indication', 15, 2, 500);

    expect(dose.calculatedSingleDoseMg).toBe(825);
    expect(dose.isExceedingAdultCap).toBe(true);
    expect(dose.finalSafeSingleDoseMg).toBe(500);
  });
});
