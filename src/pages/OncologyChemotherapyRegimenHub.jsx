/**
 * Precision Oncology Chemotherapy Regimen & CTCAE Toxicity Command Center Hub
 * Interactive dashboard for dosing calculations (BSA Mosteller / Calvert AUC), organ toxicity grading,
 * and dose adjustment recommendations.
 */

import React, { useState } from 'react';
import {
  OncologyChemotherapyEngine,
  PatientOncologyProfile,
  CTCAEToxicityGrade,
  RegimenSafetyAssessment,
} from '../../utils/OncologyChemotherapyEngine';

const INITIAL_PATIENT: PatientOncologyProfile = {
  patientId: 'ONC-PT-9042',
  weightKg: 70,
  heightCm: 172,
  serumCreatinineMgDl: 1.1,
  gender: 'FEMALE',
  ageYears: 62,
  cancerType: 'OVARIAN',
};

const INITIAL_TOXICITIES: CTCAEToxicityGrade[] = [
  { toxicityCategory: 'NEUTROPENIA', currentGrade: 3, clinicalDescription: 'ANC < 1.0 - 0.5 x 10^9/L (Grade 3 Severe)' },
  { toxicityCategory: 'NEUROPATHY', currentGrade: 1, clinicalDescription: 'Asymptomatic loss of deep tendon reflexes' },
  { toxicityCategory: 'NEPHROTOXICITY', currentGrade: 0, clinicalDescription: 'Normal renal clearance' },
];

export default function OncologyChemotherapyRegimenHub() {
  const [patient, setPatient] = useState<PatientOncologyProfile>(INITIAL_PATIENT);
  const [toxicities, setToxicities] = useState<CTCAEToxicityGrade[]>(INITIAL_TOXICITIES);

  const engine = new OncologyChemotherapyEngine(patient, toxicities);
  const assessment: RegimenSafetyAssessment = engine.evaluateRegimenSafety();

  const handleToxicityGradeChange = (category: CTCAEToxicityGrade['toxicityCategory'], newGrade: number) => {
    setToxicities(prev =>
      prev.map(t => (t.toxicityCategory === category ? { ...t, currentGrade: newGrade as any } : t))
    );
  };

  const getToxicityBadgeStyle = (grade: number) => {
    switch (grade) {
      case 4:
      case 5: return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 3: return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' };
      case 2: return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    }
  };

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#0F172A' }}>
      {/* Header Banner */}
      <header style={{ marginBottom: '28px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#0F172A', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              🧬 Precision Oncology Chemotherapy Regimen & Toxicity Hub
            </h1>
            <span style={{
              backgroundColor: assessment.isDoseReductionRequired ? '#FFEDD5' : '#DCFCE7',
              color: assessment.isDoseReductionRequired ? '#C2410C' : '#15803D',
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
            }}>
              {assessment.isDoseReductionRequired ? `Dose Reduction: -${assessment.recommendedDoseAdjustmentPercent}%` : 'Standard Dosing'}
            </span>
          </div>
          <p style={{ color: '#64748B', marginTop: '6px', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
            BSA Mosteller, Calvert AUC CrCl dosing calculator, CTCAE v5.0 organ toxicity grading, and G-CSF prophylaxis protocols.
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Patient ID: <strong>{patient.patientId}</strong></span>
        </div>
      </header>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Body Surface Area (BSA)</span>
          <h2 style={{ color: '#2563EB', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{assessment.calculatedBsaM2} m&sup2;</h2>
          <small style={{ color: '#64748B' }}>Mosteller Formula</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #16A34A' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>eGFR / CrCl Clearance</span>
          <h2 style={{ color: '#16A34A', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{assessment.calculatedGfrMlMin} mL/min</h2>
          <small style={{ color: '#64748B' }}>Cockcroft-Gault Equation</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #D97706' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Max CTCAE Organ Toxicity</span>
          <h2 style={{ color: '#D97706', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>Grade {assessment.maxToxicityGrade}</h2>
          <small style={{ color: '#64748B' }}>CTCAE v5.0 Standard</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #9333EA' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>G-CSF Support Protocol</span>
          <h2 style={{ color: '#9333EA', margin: '8px 0 4px 0', fontSize: '1.8rem', fontWeight: 800 }}>
            {assessment.gcsfProphylaxisIndicated ? 'INDICATED' : 'NOT INDICATED'}
          </h2>
          <small style={{ color: '#64748B' }}>Filgrastim / Pegfilgrastim</small>
        </div>
      </div>

      {/* Main Layout Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Patient Parameters Form */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            👤 Patient Clinical Parameters & Protocol
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Cancer Type Protocol</label>
              <select
                value={patient.cancerType}
                onChange={(e) => setPatient({ ...patient, cancerType: e.target.value as any })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                <option value="OVARIAN">Ovarian Cancer (Paclitaxel + Carboplatin)</option>
                <option value="BREAST">Breast Cancer (AC-T Protocol)</option>
                <option value="NON_SMALL_CELL_LUNG">NSCLC (Cisplatin + Pemetrexed)</option>
                <option value="COLORECTAL">Colorectal (FOLFOX Protocol)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Weight (kg)</label>
                <input
                  type="number"
                  value={patient.weightKg}
                  onChange={(e) => setPatient({ ...patient, weightKg: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Height (cm)</label>
                <input
                  type="number"
                  value={patient.heightCm}
                  onChange={(e) => setPatient({ ...patient, heightCm: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Serum Creatinine (mg/dL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={patient.serumCreatinineMgDl}
                  onChange={(e) => setPatient({ ...patient, serumCreatinineMgDl: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Age (Years)</label>
                <input
                  type="number"
                  value={patient.ageYears}
                  onChange={(e) => setPatient({ ...patient, ageYears: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Chemotherapy Dose Schedule */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            💉 Calculated Chemotherapy Dose Schedule
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assessment.chemotherapyDoses.map((dose, idx) => {
              const adjustedDose = assessment.isDoseReductionRequired
                ? Math.round(dose.calculatedDose * (1 - assessment.recommendedDoseAdjustmentPercent / 100))
                : dose.calculatedDose;

              return (
                <div key={idx} style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '1rem', display: 'block' }}>{dose.drugName}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Formula: {dose.dosingType.replace('_', ' ')} ({dose.targetDosePerM2OrAuc} {dose.dosingType === 'CALVERT_AUC' ? 'AUC' : 'mg/m²'})
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563EB' }}>
                      {adjustedDose} {dose.unit}
                    </span>
                    {assessment.isDoseReductionRequired && (
                      <span style={{ fontSize: '0.75rem', display: 'block', color: '#DC2626', textDecoration: 'line-through' }}>
                        Base: {dose.calculatedDose} {dose.unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTCAE v5.0 Toxicity Management Panel */}
      <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
          🩺 CTCAE v5.0 Adverse Organ Toxicity Grading
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {toxicities.map((tox, idx) => {
            const style = getToxicityBadgeStyle(tox.currentGrade);
            return (
              <div key={idx} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${style.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{tox.toxicityCategory}</span>
                  <span style={{ backgroundColor: style.bg, color: style.text, padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    Grade {tox.currentGrade}
                  </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748B' }}>{tox.clinicalDescription}</p>
                <select
                  value={tox.currentGrade}
                  onChange={(e) => handleToxicityGradeChange(tox.toxicityCategory, Number(e.target.value))}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value={0}>Grade 0 (None)</option>
                  <option value={1}>Grade 1 (Mild)</option>
                  <option value={2}>Grade 2 (Moderate)</option>
                  <option value={3}>Grade 3 (Severe)</option>
                  <option value={4}>Grade 4 (Life-Threatening)</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
