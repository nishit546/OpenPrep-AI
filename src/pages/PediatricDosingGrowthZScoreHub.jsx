/**
 * Precision Pediatric Dosing & WHO Growth Percentile Command Center Hub
 * Interactive dashboard for child growth Z-score monitoring, weight-based mg/kg dosing,
 * and adult safety dose cap enforcement.
 */

import React, { useState } from 'react';
import {
  PediatricDosingEngine,
  PediatricPatientProfile,
  GrowthZScoreAssessment,
  PediatricDrugDoseCalculation,
} from '../../utils/PediatricDosingEngine';
import { PEDIATRIC_FORMULARY_CATALOG } from '../../utils/PediatricFormularyCatalog';
import { calculatePediatricBsa, evaluateGrowthVelocity } from '../../utils/PediatricGrowthExtension';

const INITIAL_PEDIATRIC_PATIENT: PediatricPatientProfile = {
  patientId: 'PED-PT-3309',
  gender: 'MALE',
  ageMonths: 24,
  weightKg: 12.5,
  heightCm: 86,
  headCircumferenceCm: 48,
};

export default function PediatricDosingGrowthZScoreHub() {
  const [patient, setPatient] = useState<PediatricPatientProfile>(INITIAL_PEDIATRIC_PATIENT);
  const [selectedDrug, setSelectedDrug] = useState<string>('Amoxicillin');

  const engine = new PediatricDosingEngine(patient);
  const growthAssessment: GrowthZScoreAssessment = engine.evaluateGrowthZScores();
  const bsaResult = calculatePediatricBsa(patient.weightKg, patient.heightCm);

  const formularyItem = PEDIATRIC_FORMULARY_CATALOG.find(f => f.drugName === selectedDrug) || PEDIATRIC_FORMULARY_CATALOG[0];
  const doseCalc: PediatricDrugDoseCalculation = engine.calculateMedicationDose(
    formularyItem.drugName,
    formularyItem.indication,
    formularyItem.defaultMgPerKgPerDose,
    formularyItem.dosesPerDay,
    formularyItem.maxAdultSingleDoseMg
  );

  const calculatedLiquidVolumeMl = formularyItem.concentrationMgPerMl
    ? Math.round((doseCalc.finalSafeSingleDoseMg / formularyItem.concentrationMgPerMl) * 10) / 10
    : null;

  const getGrowthBadgeStyle = (status: string) => {
    switch (status) {
      case 'SEVERE_UNDERWEIGHT':
      case 'OBESE': return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 'UNDERWEIGHT':
      case 'OVERWEIGHT': return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' };
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    }
  };

  const badgeStyle = getGrowthBadgeStyle(growthAssessment.growthStatus);

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#0F172A' }}>
      {/* Header Banner */}
      <header style={{ marginBottom: '28px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#0F172A', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              👶 Pediatric Dosing & WHO Growth Percentile Z-Score Hub
            </h1>
            <span style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
              {growthAssessment.growthStatus.replace('_', ' ')}
            </span>
          </div>
          <p style={{ color: '#64748B', marginTop: '6px', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
            WHO/CDC growth standard Z-score analysis, weight-based mg/kg medication dosing, and adult safety cap enforcement.
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Patient ID: <strong>{patient.patientId}</strong></span>
        </div>
      </header>

      {/* Growth Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Weight-for-Age Z-Score</span>
          <h2 style={{ color: '#2563EB', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{growthAssessment.weightForAgeZScore} SD</h2>
          <small style={{ color: '#64748B' }}>{growthAssessment.weightForAgePercentile}th Percentile (WHO)</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #16A34A' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Height-for-Age Z-Score</span>
          <h2 style={{ color: '#16A34A', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{growthAssessment.heightForAgeZScore} SD</h2>
          <small style={{ color: '#64748B' }}>{growthAssessment.heightForAgePercentile}th Percentile (WHO)</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #D97706' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Calculated Single Dose</span>
          <h2 style={{ color: '#D97706', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{doseCalc.finalSafeSingleDoseMg} mg</h2>
          <small style={{ color: '#64748B' }}>Target Drug: {selectedDrug}</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #9333EA' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pediatric BSA (Haycock)</span>
          <h2 style={{ color: '#9333EA', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{bsaResult.haycockBsaM2} m&sup2;</h2>
          <small style={{ color: '#64748B' }}>Boyd BSA: {bsaResult.boydBsaM2} m&sup2;</small>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Dosing Calculation & Safety Panel */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            💊 Weight-Based Pediatric Dosing Calculation
          </h3>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Select Medication</label>
            <select
              value={selectedDrug}
              onChange={(e) => setSelectedDrug(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 600 }}
            >
              {PEDIATRIC_FORMULARY_CATALOG.map(f => (
                <option key={f.drugName} value={f.drugName}>
                  {f.drugName} ({f.indication})
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '8px', borderLeft: '4px solid #2563EB', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.95rem' }}>{doseCalc.drugName} ({doseCalc.indication})</span>
              {doseCalc.isExceedingAdultCap && (
                <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ⚠️ Adult Dose Cap Enforced
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '0.85rem' }}>
              Dose Rate: {doseCalc.recommendedDoseMgPerKg} mg/kg | Total Daily: {doseCalc.calculatedDailyTotalMg} mg (Max Adult Daily: {doseCalc.maxAdultDailyDoseMg} mg)
            </p>
            {calculatedLiquidVolumeMl && (
              <span style={{ display: 'block', marginTop: '8px', fontWeight: 700, color: '#16A34A', fontSize: '0.9rem' }}>
                🧪 Oral Liquid Dispensing Volume: {calculatedLiquidVolumeMl} mL ({formularyItem.concentrationMgPerMl} mg/mL)
              </span>
            )}
          </div>
        </div>

        {/* Patient Parameters Form */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            📏 Child Anthropometric Measurements
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Age (Months)</label>
                <input
                  type="number"
                  value={patient.ageMonths}
                  onChange={(e) => setPatient({ ...patient, ageMonths: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={patient.weightKg}
                  onChange={(e) => setPatient({ ...patient, weightKg: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Height / Length (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={patient.heightCm}
                  onChange={(e) => setPatient({ ...patient, heightCm: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gender</label>
                <select
                  value={patient.gender}
                  onChange={(e) => setPatient({ ...patient, gender: e.target.value as any })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
