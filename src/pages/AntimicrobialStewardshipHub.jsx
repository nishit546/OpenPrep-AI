/**
 * Antimicrobial Stewardship & Cumulative Antibiogram Command Center Hub
 * Interactive dashboard for pathogen susceptibility profiling, MIC breakpoint tracking,
 * and Multi-Drug Resistant (MDR/XDR) outbreak surveillance.
 */

import React, { useState } from 'react';
import {
  AntimicrobialStewardshipEngine,
  PathogenIsolateRecord,
  AntibiogramSummaryRow,
  PathogenResistanceEvaluation,
} from '../../utils/AntimicrobialStewardshipEngine';
import { ANTIBIOTIC_SPECTRUM_CATALOG, getAntibioticMeta } from '../../utils/AntimicrobialCatalog';

const INITIAL_ISOLATES: PathogenIsolateRecord[] = [
  {
    isolateId: 'ISO-8801',
    patientId: 'PT-ICU-102',
    specimenSource: 'BLOOD',
    organismName: 'Pseudomonas aeruginosa',
    gramStain: 'GRAM_NEGATIVE',
    susceptibilityPanel: [
      { antibioticName: 'Piperacillin-Tazobactam', micValueUgMl: 8, breakpointInterpretation: 'SUSCEPTIBLE' },
      { antibioticName: 'Cefepime', micValueUgMl: 16, breakpointInterpretation: 'INTERMEDIATE' },
      { antibioticName: 'Meropenem', micValueUgMl: 32, breakpointInterpretation: 'RESISTANT' },
      { antibioticName: 'Ciprofloxacin', micValueUgMl: 4, breakpointInterpretation: 'RESISTANT' },
      { antibioticName: 'Gentamicin', micValueUgMl: 16, breakpointInterpretation: 'RESISTANT' },
    ],
    isolatedAt: '2026-08-28',
  },
  {
    isolateId: 'ISO-8802',
    patientId: 'PT-MED-405',
    specimenSource: 'SPUTUM',
    organismName: 'Staphylococcus aureus (MRSA)',
    gramStain: 'GRAM_POSITIVE',
    susceptibilityPanel: [
      { antibioticName: 'Vancomycin', micValueUgMl: 1, breakpointInterpretation: 'SUSCEPTIBLE' },
      { antibioticName: 'Linezolid', micValueUgMl: 2, breakpointInterpretation: 'SUSCEPTIBLE' },
      { antibioticName: 'Oxacillin', micValueUgMl: 8, breakpointInterpretation: 'RESISTANT' },
      { antibioticName: 'Erythromycin', micValueUgMl: 16, breakpointInterpretation: 'RESISTANT' },
    ],
    isolatedAt: '2026-08-29',
  },
];

export default function AntimicrobialStewardshipHub() {
  const [isolates, setIsolates] = useState<PathogenIsolateRecord[]>(INITIAL_ISOLATES);
  const [selectedIsolateId, setSelectedIsolateId] = useState<string>('ISO-8801');
  const [activeTab, setActiveTab] = useState<'PANEL' | 'SPECTRUM_CATALOG'>('PANEL');

  const engine = new AntimicrobialStewardshipEngine(isolates);
  const antibiogram: AntibiogramSummaryRow[] = engine.generateCumulativeAntibiogram();
  const evaluation: PathogenResistanceEvaluation | null = engine.evaluateIsolateResistance(selectedIsolateId);

  const getCategoryBadgeStyle = (cat?: string) => {
    switch (cat) {
      case 'PANDRUG_RESISTANT':
      case 'EXTENSIVELY_DRUG_RESISTANT': return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 'MULTI_DRUG_RESISTANT': return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' };
      default: return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    }
  };

  const selectedIsolate = isolates.find(i => i.isolateId === selectedIsolateId);
  const badgeStyle = getCategoryBadgeStyle(evaluation?.resistanceCategory);

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh', color: '#0F172A' }}>
      {/* Header Banner */}
      <header style={{ marginBottom: '28px', borderBottom: '2px solid #E2E8F0', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ color: '#0F172A', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              🧫 Antimicrobial Stewardship & Antibiogram Analytics Hub
            </h1>
            {evaluation && (
              <span style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                {evaluation.resistanceCategory.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p style={{ color: '#64748B', marginTop: '6px', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
            CLSI M100 MIC breakpoint interpretation, facility cumulative antibiograms, and MDR outbreak surveillance.
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Total Isolates Analyzed: <strong>{isolates.length}</strong></span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('PANEL')}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
            backgroundColor: activeTab === 'PANEL' ? '#2563EB' : '#E2E8F0',
            color: activeTab === 'PANEL' ? '#FFF' : '#475569',
          }}
        >
          🔬 Active MIC Susceptibility Panel
        </button>
        <button
          onClick={() => setActiveTab('SPECTRUM_CATALOG')}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
            backgroundColor: activeTab === 'SPECTRUM_CATALOG' ? '#2563EB' : '#E2E8F0',
            color: activeTab === 'SPECTRUM_CATALOG' ? '#FFF' : '#475569',
          }}
        >
          📚 Antimicrobial Spectrum Reference Guide
        </button>
      </div>

      {activeTab === 'PANEL' ? (
        <>
          {/* KPI Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563EB' }}>
              <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Pathogen Organisms</span>
              <h2 style={{ color: '#2563EB', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{antibiogram.length} Species</h2>
              <small style={{ color: '#64748B' }}>Cumulative Antibiogram Pool</small>
            </div>

            <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #16A34A' }}>
              <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Antibiotic Options</span>
              <h2 style={{ color: '#16A34A', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>{evaluation?.activeAntibioticsCount || 0} Drugs</h2>
              <small style={{ color: '#64748B' }}>Susceptible for selected isolate</small>
            </div>

            <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #D97706' }}>
              <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Target Organism</span>
              <h2 style={{ color: '#D97706', margin: '8px 0 4px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                {selectedIsolate?.organismName || 'N/A'}
              </h2>
              <small style={{ color: '#64748B' }}>Isolate ID: {selectedIsolateId}</small>
            </div>

            <div style={{ background: '#FFF', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '5px solid #DC2626' }}>
              <span style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Specimen Source</span>
              <h2 style={{ color: '#DC2626', margin: '8px 0 4px 0', fontSize: '2.2rem', fontWeight: 800 }}>
                {selectedIsolate?.specimenSource || 'N/A'}
              </h2>
              <small style={{ color: '#64748B' }}>Patient: {selectedIsolate?.patientId}</small>
            </div>
          </div>

          {/* Main Content Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            {/* Isolate Selection & Panel Detail */}
            <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
                🧫 Select Pathogen Isolate for MIC Panel Analysis
              </h3>
              <div style={{ marginBottom: '20px' }}>
                <select
                  value={selectedIsolateId}
                  onChange={(e) => setSelectedIsolateId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 600 }}
                >
                  {isolates.map(iso => (
                    <option key={iso.isolateId} value={iso.isolateId}>
                      {iso.isolateId} - {iso.organismName} ({iso.specimenSource})
                    </option>
                  ))}
                </select>
              </div>

              {evaluation && (
                <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '8px', borderLeft: '4px solid #2563EB', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF', display: 'block' }}>Stewardship Empiric Guidance:</span>
                  <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {evaluation.recommendedEmpiricRegimen}
                  </p>
                </div>
              )}

              <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>MIC Susceptibility Panel</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedIsolate?.susceptibilityPanel.map((panel, idx) => {
                  const meta = getAntibioticMeta(panel.antibioticName);
                  return (
                    <div key={idx} style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{panel.antibioticName}</span>
                        {meta && <span style={{ fontSize: '0.75rem', color: '#2563EB', display: 'block' }}>Class: {meta.classCategory}</span>}
                        <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>MIC: {panel.micValueUgMl} &mu;g/mL</span>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: panel.breakpointInterpretation === 'SUSCEPTIBLE' ? '#DCFCE7' : panel.breakpointInterpretation === 'INTERMEDIATE' ? '#FEF3C7' : '#FEE2E2',
                        color: panel.breakpointInterpretation === 'SUSCEPTIBLE' ? '#166534' : panel.breakpointInterpretation === 'INTERMEDIATE' ? '#92400E' : '#991B1B',
                      }}>
                        {panel.breakpointInterpretation}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cumulative Antibiogram Summary Table */}
            <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
                📊 Cumulative Facility Antibiogram
              </h3>
              <div style={{ overflowX: 'auto' }}>
                {antibiogram.map((row, idx) => (
                  <div key={idx} style={{ marginBottom: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{row.organismName}</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Tested Isolates: {row.totalIsolatesCount}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {row.antibioticSusceptibilityRates.map((rate, rIdx) => (
                        <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#475569' }}>{rate.antibioticName}</span>
                          <span style={{ fontWeight: 700, color: rate.susceptiblePercent >= 80 ? '#16A34A' : rate.susceptiblePercent >= 50 ? '#D97706' : '#DC2626' }}>
                            {rate.susceptiblePercent}% Susceptible
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Spectrum Reference Catalog View */
        <div style={{ background: '#FFF', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1E293B', fontSize: '1.2rem', fontWeight: 700 }}>
            📖 Antimicrobial Spectrum Reference Guide
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {ANTIBIOTIC_SPECTRUM_CATALOG.map((item, idx) => (
              <div key={idx} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{item.antibioticName}</span>
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {item.classCategory}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#475569' }}>{item.typicalCoverage}</p>
                <small style={{ color: item.renalAdjustmentRequired ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                  {item.renalAdjustmentRequired ? '⚠️ Renal Dose Adjustment Required' : '✅ No Renal Dose Adjustment'}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
