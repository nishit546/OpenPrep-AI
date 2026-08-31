/**
 * Perioperative Anesthesia Risk Scoring & Airway Evaluation Command Center Hub
 * Interactive dashboard for ASA physical status rating, Mallampati airway scoring,
 * RCRI cardiac risk stratification, and STOP-Bang OSA screening.
 */

import React, { useState } from 'react';
import {
  PerioperativeAnesthesiaEngine,
  PatientPreopAssessment,
  PerioperativeRiskReport,
} from '../../utils/PerioperativeAnesthesiaEngine';

const INITIAL_ASSESSMENT: PatientPreopAssessment = {
  patientId: 'ANE-PT-7701',
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

export default function PerioperativeAnesthesiaRiskHub() {
  const [assessment, setAssessment] = useState<PatientPreopAssessment>(INITIAL_ASSESSMENT);

  const engine = new PerioperativeAnesthesiaEngine(assessment);
  const report: PerioperativeRiskReport = engine.generateReport();
  const { airway, cardiac, osa } = report;

  const getAirwayBadgeStyle = (level: string) => {
    switch (level) {
      case 'HIGH_RISK_DIFFICULT_AIRWAY': return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 'MODERATE_RISK': return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' };
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    }
  };

  const badgeStyle = getAirwayBadgeStyle(airway.airwayRiskLevel);

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#0F172A' }}>
      {/* Header Banner */}
      <header style={{ marginBottom: '28px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#0F172A', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              🫁 Perioperative Anesthesia Risk Scoring & Airway Hub
            </h1>
            <span style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
              {airway.airwayRiskLevel.replace(/_/g, ' ')}
            </span>
          </div>
          <p style={{ color: '#64748B', marginTop: '6px', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
            ASA Physical Status, Mallampati Airway, Lee's RCRI Cardiac Index, and STOP-Bang Obstructive Sleep Apnea evaluation.
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Patient ID: <strong>{assessment.patientId}</strong></span>
        </div>
      </header>

      {/* Primary KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>ASA Physical Status</span>
          <h2 style={{ color: '#2563EB', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>ASA Class {assessment.asaClass}</h2>
          <small style={{ color: '#64748B' }}>{report.asaPhysicalStatusLabel}</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #D97706' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Mallampati Class</span>
          <h2 style={{ color: '#D97706', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>Class {airway.mallampatiScore}</h2>
          <small style={{ color: '#64748B' }}>Mouth Opening: {assessment.mouthOpeningCm} cm</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #DC2626' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>RCRI MACE Cardiac Risk</span>
          <h2 style={{ color: '#DC2626', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{cardiac.cardiacRiskPercent}% Risk</h2>
          <small style={{ color: '#64748B' }}>RCRI Score: {cardiac.rcriScore} / 6 ({cardiac.cardiacRiskTier})</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #9333EA' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>STOP-Bang OSA Score</span>
          <h2 style={{ color: '#9333EA', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{osa.stopBangScore} / 8</h2>
          <small style={{ color: '#64748B' }}>Category: {osa.osaRiskCategory.replace(/_/g, ' ')}</small>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Airway & Anesthetic Recommendation Panel */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            🩺 Anesthetic Plan & Airway Management Protocol
          </h3>
          <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '8px', borderLeft: '4px solid #2563EB', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF', display: 'block' }}>Primary Anesthetic Strategy:</span>
            <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {report.anestheticPlanRecommendation}
            </p>
          </div>

          <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>🛠️ Recommended Airway Equipment</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {airway.recommendedEquipment.map((eq, idx) => (
              <li key={idx} style={{ fontWeight: 600 }}>{eq}</li>
            ))}
          </ul>
        </div>

        {/* Patient Parameters Form */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            📝 Preoperative Patient Parameters
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ASA Physical Status</label>
                <select
                  value={assessment.asaClass}
                  onChange={(e) => setAssessment({ ...assessment, asaClass: Number(e.target.value) as any })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value={1}>ASA I (Healthy)</option>
                  <option value={2}>ASA II (Mild Disease)</option>
                  <option value={3}>ASA III (Severe Disease)</option>
                  <option value={4}>ASA IV (Threat to Life)</option>
                  <option value={5}>ASA V (Moribund)</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Mallampati Class</label>
                <select
                  value={assessment.mallampatiScore}
                  onChange={(e) => setAssessment({ ...assessment, mallampatiScore: Number(e.target.value) as any })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value={1}>Class I</option>
                  <option value={2}>Class II</option>
                  <option value={3}>Class III</option>
                  <option value={4}>Class IV</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Mouth Opening (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={assessment.mouthOpeningCm}
                  onChange={(e) => setAssessment({ ...assessment, mouthOpeningCm: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Thyromental Dist. (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={assessment.thyromentalDistanceCm}
                  onChange={(e) => setAssessment({ ...assessment, thyromentalDistanceCm: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={assessment.hasHighRiskSurgery}
                  onChange={(e) => setAssessment({ ...assessment, hasHighRiskSurgery: e.target.checked })}
                />
                High-Risk Intraperitoneal / Intrathoracic / Vascular Surgery
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={assessment.hasHistoryIschemicHeartDisease}
                  onChange={(e) => setAssessment({ ...assessment, hasHistoryIschemicHeartDisease: e.target.checked })}
                />
                History of Ischemic Heart Disease (MI / Angina)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={assessment.snoringHeavy}
                  onChange={(e) => setAssessment({ ...assessment, snoringHeavy: e.target.checked })}
                />
                Heavy Loud Snoring (STOP-Bang Criteria)
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
