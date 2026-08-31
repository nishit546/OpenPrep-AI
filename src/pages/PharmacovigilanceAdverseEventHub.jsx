/**
 * Pharmacovigilance & Adverse Drug Event Surveillance Command Center Hub
 * Interactive dashboard for real-time safety signal detection, disproportionality metrics (PRR/ROR/IC),
 * and drug safety profile monitoring.
 */

import React, { useState } from 'react';
import {
  PharmacovigilanceEngine,
  AdverseEventReport,
  DisproportionalityMetrics,
  DrugSafetyProfile,
} from '../../utils/PharmacovigilanceEngine';

const MOCK_ADVERSE_REPORTS: AdverseEventReport[] = [
  { reportId: 'ADR-8901', drugName: 'Lisinopril', adverseEventTerm: 'Angioedema', reactionSeverity: 'SEVERE', patientAgeGroup: 'GERIATRIC', reporterType: 'PHYSICIAN', reportedAt: '2026-08-25', isConfirmedByLab: true },
  { reportId: 'ADR-8902', drugName: 'Lisinopril', adverseEventTerm: 'Dry Cough', reactionSeverity: 'MILD', patientAgeGroup: 'ADULT', reporterType: 'PATIENT', reportedAt: '2026-08-26', isConfirmedByLab: false },
  { reportId: 'ADR-8903', drugName: 'Lisinopril', adverseEventTerm: 'Angioedema', reactionSeverity: 'LIFE_THREATENING', patientAgeGroup: 'GERIATRIC', reporterType: 'PHYSICIAN', reportedAt: '2026-08-27', isConfirmedByLab: true },
  { reportId: 'ADR-8904', drugName: 'Metformin', adverseEventTerm: 'Lactic Acidosis', reactionSeverity: 'SEVERE', patientAgeGroup: 'GERIATRIC', reporterType: 'PHYSICIAN', reportedAt: '2026-08-28', isConfirmedByLab: true },
  { reportId: 'ADR-8905', drugName: 'Amiodarone', adverseEventTerm: 'Pulmonary Toxicity', reactionSeverity: 'LIFE_THREATENING', patientAgeGroup: 'GERIATRIC', reporterType: 'PHYSICIAN', reportedAt: '2026-08-29', isConfirmedByLab: true },
  { reportId: 'ADR-8906', drugName: 'Lisinopril', adverseEventTerm: 'Hyperkalemia', reactionSeverity: 'MODERATE', patientAgeGroup: 'ADULT', reporterType: 'PHARMACIST', reportedAt: '2026-08-29', isConfirmedByLab: true },
];

export default function PharmacovigilanceAdverseEventHub() {
  const [reports, setReports] = useState<AdverseEventReport[]>(MOCK_ADVERSE_REPORTS);
  const [selectedDrug, setSelectedDrug] = useState<string>('Lisinopril');
  const [selectedEvent, setSelectedEvent] = useState<string>('Angioedema');

  // Form State
  const [formDrug, setFormDrug] = useState<string>('Lisinopril');
  const [formEvent, setFormEvent] = useState<string>('Angioedema');
  const [formSeverity, setFormSeverity] = useState<AdverseEventReport['reactionSeverity']>('SEVERE');
  const [formAgeGroup, setFormAgeGroup] = useState<AdverseEventReport['patientAgeGroup']>('GERIATRIC');
  const [formReporter, setFormReporter] = useState<AdverseEventReport['reporterType']>('PHYSICIAN');

  const engine = new PharmacovigilanceEngine(reports);
  const signalMetrics: DisproportionalityMetrics = engine.evaluateSignalMetrics(selectedDrug, selectedEvent);
  const safetyProfile: DrugSafetyProfile = engine.generateDrugSafetyProfile(selectedDrug);

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport: AdverseEventReport = {
      reportId: `ADR-${Math.floor(1000 + Math.random() * 9000)}`,
      drugName: formDrug,
      adverseEventTerm: formEvent,
      reactionSeverity: formSeverity,
      patientAgeGroup: formAgeGroup,
      reporterType: formReporter,
      reportedAt: new Date().toISOString().split('T')[0],
      isConfirmedByLab: true,
    };

    setReports(prev => [newReport, ...prev]);
  };

  const getSignalBadgeStyle = (status: string) => {
    switch (status) {
      case 'STRONG_SIGNAL': return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 'MODERATE_SIGNAL': return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' };
      case 'WEAK_SIGNAL': return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    }
  };

  const badgeStyle = getSignalBadgeStyle(signalMetrics.signalStatus);

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#0F172A' }}>
      {/* Header Banner */}
      <header style={{ marginBottom: '28px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#0F172A', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              💊 Pharmacovigilance & Adverse Drug Reaction (ADR) Command Hub
            </h1>
            <span style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
              {signalMetrics.signalStatus.replace('_', ' ')}
            </span>
          </div>
          <p style={{ color: '#64748B', marginTop: '6px', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
            Real-time disproportionality algorithm surveillance (PRR / ROR / BCPNN IC) for pharmaceutical safety & clinical prep telemetry.
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Total ADR Telemetry Reports: <strong>{reports.length}</strong></span>
        </div>
      </header>

      {/* KPI Metrics Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563EB' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Proportional Reporting Ratio (PRR)</span>
          <h2 style={{ color: '#2563EB', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{signalMetrics.proportionalReportingRatio}</h2>
          <small style={{ color: '#64748B' }}>Threshold &ge; 2.0 indicates signal</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #D97706' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Reporting Odds Ratio (ROR)</span>
          <h2 style={{ color: '#D97706', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{signalMetrics.reportingOddsRatio}</h2>
          <small style={{ color: '#64748B' }}>Disproportionality odds metric</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #9333EA' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>BCPNN Information Component (IC)</span>
          <h2 style={{ color: '#9333EA', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{signalMetrics.informationComponent}</h2>
          <small style={{ color: '#64748B' }}>Bayesian neural network metric</small>
        </div>

        <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #DC2626' }}>
          <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Overall Drug Risk Score</span>
          <h2 style={{ color: '#DC2626', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{safetyProfile.overallSafetyRiskScore} / 100</h2>
          <small style={{ color: '#64748B' }}>Target Drug: {selectedDrug}</small>
        </div>
      </div>

      {/* Control Panel & Form Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Signal Search Panel */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            🔍 Query Drug-Event Pair Signal
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Target Drug Name</label>
              <select
                value={selectedDrug}
                onChange={(e) => setSelectedDrug(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
              >
                <option value="Lisinopril">Lisinopril</option>
                <option value="Metformin">Metformin</option>
                <option value="Amiodarone">Amiodarone</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Target Adverse Event Term</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
              >
                <option value="Angioedema">Angioedema</option>
                <option value="Dry Cough">Dry Cough</option>
                <option value="Lactic Acidosis">Lactic Acidosis</option>
                <option value="Pulmonary Toxicity">Pulmonary Toxicity</option>
                <option value="Hyperkalemia">Hyperkalemia</option>
              </select>
            </div>

            <div style={{ marginTop: '12px', padding: '16px', background: '#F1F5F9', borderRadius: '8px', borderLeft: '4px solid #0F172A' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', display: 'block' }}>High-Risk Patient Demographic:</span>
              <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '0.9rem' }}>
                Primary subgroup: <strong>{safetyProfile.highRiskDemographic}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* New Report Form */}
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            📥 Log Adverse Drug Reaction (ADR) Report
          </h3>
          <form onSubmit={handleAddReport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Drug</label>
                <input
                  type="text"
                  value={formDrug}
                  onChange={(e) => setFormDrug(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Event Term</label>
                <input
                  type="text"
                  value={formEvent}
                  onChange={(e) => setFormEvent(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Severity</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="MILD">MILD</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="SEVERE">SEVERE</option>
                  <option value="LIFE_THREATENING">LIFE THREATENING</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Age Demographic</label>
                <select
                  value={formAgeGroup}
                  onChange={(e) => setFormAgeGroup(e.target.value as any)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="PEDIATRIC">PEDIATRIC</option>
                  <option value="ADULT">ADULT</option>
                  <option value="GERIATRIC">GERIATRIC</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '10px',
                padding: '10px',
                background: '#0F172A',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Submit Safety Report
            </button>
          </form>
        </div>
      </div>

      {/* Adverse Events Stream Table */}
      <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
          📋 Live Pharmacovigilance Surveillance Stream
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569', background: '#F8FAFC' }}>
                <th style={{ padding: '12px' }}>Report ID</th>
                <th style={{ padding: '12px' }}>Drug</th>
                <th style={{ padding: '12px' }}>Adverse Event</th>
                <th style={{ padding: '12px' }}>Severity</th>
                <th style={{ padding: '12px' }}>Demographic</th>
                <th style={{ padding: '12px' }}>Reporter</th>
                <th style={{ padding: '12px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1E293B' }}>{r.reportId}</td>
                  <td style={{ padding: '12px', color: '#2563EB', fontWeight: 600 }}>{r.drugName}</td>
                  <td style={{ padding: '12px', color: '#0F172A', fontWeight: 600 }}>{r.adverseEventTerm}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: r.reactionSeverity === 'LIFE_THREATENING' || r.reactionSeverity === 'SEVERE' ? '#DC2626' : '#D97706',
                      fontWeight: 700,
                    }}>
                      {r.reactionSeverity}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{r.patientAgeGroup}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{r.reporterType}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{r.reportedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
