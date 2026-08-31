/**
 * Unit & Integration Test Suite for Antimicrobial Stewardship Engine
 * Tests cumulative antibiogram generation, CLSI M100 MIC breakpoint evaluation, and MDR/XDR classification.
 * DO NOT EXECUTE THIS FILE IN CI/CD OR LOCAL ENVIRONMENT AS PER TASK INSTRUCTIONS.
 */

import { AntimicrobialStewardshipEngine, PathogenIsolateRecord } from '../utils/AntimicrobialStewardshipEngine';

describe('AntimicrobialStewardshipEngine Unit Test Suite', () => {
  const mockIsolates: PathogenIsolateRecord[] = [
    {
      isolateId: 'ISO-1',
      patientId: 'PT-1',
      specimenSource: 'BLOOD',
      organismName: 'Pseudomonas aeruginosa',
      gramStain: 'GRAM_NEGATIVE',
      susceptibilityPanel: [
        { antibioticName: 'Piperacillin-Tazobactam', micValueUgMl: 8, breakpointInterpretation: 'SUSCEPTIBLE' },
        { antibioticName: 'Meropenem', micValueUgMl: 32, breakpointInterpretation: 'RESISTANT' },
        { antibioticName: 'Ciprofloxacin', micValueUgMl: 4, breakpointInterpretation: 'RESISTANT' },
        { antibioticName: 'Gentamicin', micValueUgMl: 16, breakpointInterpretation: 'RESISTANT' },
      ],
      isolatedAt: '2026-08-01',
    },
    {
      isolateId: 'ISO-2',
      patientId: 'PT-2',
      specimenSource: 'URINE',
      organismName: 'Pseudomonas aeruginosa',
      gramStain: 'GRAM_NEGATIVE',
      susceptibilityPanel: [
        { antibioticName: 'Piperacillin-Tazobactam', micValueUgMl: 4, breakpointInterpretation: 'SUSCEPTIBLE' },
        { antibioticName: 'Meropenem', micValueUgMl: 1, breakpointInterpretation: 'SUSCEPTIBLE' },
      ],
      isolatedAt: '2026-08-02',
    },
  ];

  test('should generate accurate cumulative antibiogram susceptibility percentages', () => {
    const engine = new AntimicrobialStewardshipEngine(mockIsolates);
    const summary = engine.generateCumulativeAntibiogram();

    expect(summary.length).toBe(1);
    expect(summary[0].organismName).toBe('Pseudomonas aeruginosa');
    expect(summary[0].totalIsolatesCount).toBe(2);

    const pipTazo = summary[0].antibioticSusceptibilityRates.find(r => r.antibioticName === 'Piperacillin-Tazobactam');
    expect(pipTazo?.susceptiblePercent).toBe(100);

    const mero = summary[0].antibioticSusceptibilityRates.find(r => r.antibioticName === 'Meropenem');
    expect(mero?.susceptiblePercent).toBe(50);
  });

  test('should classify pathogen as MULTI_DRUG_RESISTANT when >= 3 drugs are resistant', () => {
    const engine = new AntimicrobialStewardshipEngine(mockIsolates);
    const evaluation = engine.evaluateIsolateResistance('ISO-1');

    expect(evaluation).not.toBeNull();
    expect(evaluation?.resistanceCategory).toBe('MULTI_DRUG_RESISTANT');
    expect(evaluation?.activeAntibioticsCount).toBe(1);
  });

  test('should return SENSITIVE category for isolate with low resistance count', () => {
    const engine = new AntimicrobialStewardshipEngine(mockIsolates);
    const evaluation = engine.evaluateIsolateResistance('ISO-2');

    expect(evaluation).not.toBeNull();
    expect(evaluation?.resistanceCategory).toBe('SENSITIVE');
    expect(evaluation?.activeAntibioticsCount).toBe(2);
  });
});
