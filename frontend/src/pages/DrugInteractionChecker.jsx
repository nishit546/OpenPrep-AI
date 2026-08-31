import { useState, useMemo } from 'react';

/* ─────────────────────── MOCK DATA ─────────────────────── */
const DRUGS = [
  { id: 'warfarin', name: 'Warfarin', class: 'Anticoagulant', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'aspirin', name: 'Aspirin', class: 'NSAID / Antiplatelet', route: 'Oral', category: 'cardiovascular', color: '#f59e0b' },
  { id: 'metformin', name: 'Metformin', class: 'Biguanide', route: 'Oral', category: 'endocrine', color: '#3b82f6' },
  { id: 'lisinopril', name: 'Lisinopril', class: 'ACE Inhibitor', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'amoxicillin', name: 'Amoxicillin', class: 'Penicillin Antibiotic', route: 'Oral', category: 'antibiotic', color: '#22c55e' },
  { id: 'fluoxetine', name: 'Fluoxetine', class: 'SSRI', route: 'Oral', category: 'psychiatric', color: '#a855f7' },
  { id: 'ibuprofen', name: 'Ibuprofen', class: 'NSAID', route: 'Oral', category: 'pain', color: '#f59e0b' },
  { id: 'metoprolol', name: 'Metoprolol', class: 'Beta-Blocker', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'omeprazole', name: 'Omeprazole', class: 'Proton Pump Inhibitor', route: 'Oral', category: 'gastro', color: '#ec4899' },
  { id: 'levothyroxine', name: 'Levothyroxine', class: 'Thyroid Hormone', route: 'Oral', category: 'endocrine', color: '#3b82f6' },
  { id: 'lithium', name: 'Lithium', class: 'Mood Stabilizer', route: 'Oral', category: 'psychiatric', color: '#a855f7' },
  { id: 'simvastatin', name: 'Simvastatin', class: 'Statin', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'ciprofloxacin', name: 'Ciprofloxacin', class: 'Fluoroquinolone', route: 'Oral', category: 'antibiotic', color: '#22c55e' },
  { id: 'sertraline', name: 'Sertraline', class: 'SSRI', route: 'Oral', category: 'psychiatric', color: '#a855f7' },
  { id: 'amlodipine', name: 'Amlodipine', class: 'Calcium Channel Blocker', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'prednisone', name: 'Prednisone', class: 'Corticosteroid', route: 'Oral', category: 'inflammatory', color: '#06b6d4' },
  { id: 'methotrexate', name: 'Methotrexate', class: 'DMARD', route: 'Oral', category: 'inflammatory', color: '#06b6d4' },
  { id: 'digoxin', name: 'Digoxin', class: 'Cardiac Glycoside', route: 'Oral', category: 'cardiovascular', color: '#ef4444' },
  { id: 'diazepam', name: 'Diazepam', class: 'Benzodiazepine', route: 'Oral', category: 'psychiatric', color: '#a855f7' },
  { id: 'clopidogrel', name: 'Clopidogrel', class: 'Antiplatelet', route: 'Oral', category: 'cardiovascular', color: '#f59e0b' },
];

const INTERACTIONS = [
  { drugA: 'warfarin', drugB: 'aspirin', severity: 'major', mechanism: 'Increased bleeding risk due to synergistic anticoagulant and antiplatelet effects', clinicalEffect: 'Significantly increased risk of gastrointestinal and intracranial hemorrhage', recommendation: 'Avoid combination unless specifically indicated (e.g., mechanical heart valve with CAD). If combined, use lowest effective aspirin dose and monitor INR closely.', evidence: 'Level A', onset: 'Immediate', monitoring: 'CBC, INR, stool guaiac weekly', alternatives: ['Clopidogrel (if antiplatelet needed)', 'Acetaminophen for pain'] },
  { drugA: 'warfarin', drugB: 'amoxicillin', severity: 'moderate', mechanism: 'Antibiotics may alter gut flora that produce vitamin K, potentially increasing warfarin effect', clinicalEffect: 'Mild increase in INR, rarely clinically significant', recommendation: 'Monitor INR within 3-5 days of starting/stopping amoxicillin. Warfarin dose adjustment rarely needed.', evidence: 'Level B', onset: '3-5 days', monitoring: 'INR at day 3 and day 7', alternatives: [] },
  { drugA: 'warfarin', drugB: 'fluoxetine', severity: 'major', mechanism: 'SSRIs inhibit platelet aggregation and may inhibit CYP2C9 metabolism of warfarin', clinicalEffect: 'Increased bleeding risk through dual mechanism: platelet dysfunction + increased warfarin levels', recommendation: 'Monitor INR closely. Consider switching to non-SSRI antidepressant or use lowest SSRI dose with increased INR monitoring.', evidence: 'Level A', onset: '1-2 weeks', monitoring: 'INR weekly for 4 weeks, then monthly', alternatives: ['Mirtazapine', 'Duloxetine'] },
  { drugA: 'lisinopril', drugB: 'ibuprofen', severity: 'moderate', mechanism: 'NSAIDs inhibit renal prostaglandin synthesis, counteracting ACE inhibitor antihypertensive effect and increasing renal risk', clinicalEffect: 'Reduced antihypertensive efficacy, increased risk of acute kidney injury, hyperkalemia', recommendation: 'If NSAID needed, use lowest dose for shortest duration. Monitor BP and renal function. Consider acetaminophen instead.', evidence: 'Level A', onset: 'Days', monitoring: 'BMP (creatinine, potassium) at 1 week, BP monitoring', alternatives: ['Acetaminophen', 'Topical NSAIDs'] },
  { drugA: 'metformin', drugB: 'ciprofloxacin', severity: 'moderate', mechanism: 'Fluoroquinolones may alter blood glucose levels unpredictably', clinicalEffect: 'Risk of hypoglycemia or hyperglycemia, particularly in diabetic patients', recommendation: 'Monitor blood glucose closely during and after ciprofloxacin course. Adjust diabetes medications as needed.', evidence: 'Level B', onset: 'Days', monitoring: 'Blood glucose QID during antibiotic course', alternatives: ['Amoxicillin', 'Azithromycin'] },
  { drugA: 'fluoxetine', drugB: 'sertraline', severity: 'major', mechanism: 'Combined serotonergic effects increase risk of serotonin syndrome; both are CYP2D6 substrates', clinicalEffect: 'Serotonin syndrome (agitation, hyperthermia, clonus, diaphoresis), QT prolongation', recommendation: 'Do NOT combine two SSRIs. If switching, allow 2-week washout (5 weeks for fluoxetine due to long half-life).', evidence: 'Level A', onset: 'Hours to days', monitoring: 'Serotonin syndrome signs, ECG if high risk', alternatives: ['Switch to single SSRI', 'SNRI if needed'] },
  { drugA: 'metoprolol', drugB: 'fluoxetine', severity: 'moderate', mechanism: 'Fluoxetine inhibits CYP2D6, increasing metoprolol levels by 3-5 fold', clinicalEffect: 'Enhanced beta-blockade: bradycardia, hypotension, fatigue, exercise intolerance', recommendation: 'Reduce metoprolol dose by 50% when starting fluoxetine. Monitor heart rate and BP. Consider alternative antidepressant.', evidence: 'Level A', onset: '1-2 weeks', monitoring: 'HR, BP daily for 2 weeks, ECG if symptomatic', alternatives: ['Escitalopram (less CYP2D6 inhibition)', 'Venlafaxine'] },
  { drugA: 'lithium', drugB: 'ibuprofen', severity: 'major', mechanism: 'NSAIDs reduce renal lithium clearance by 15-25%, increasing serum levels', clinicalEffect: 'Lithium toxicity risk: tremor, ataxia, confusion, seizures, renal failure', recommendation: 'AVOID NSAIDs in lithium-treated patients. Use acetaminophen for pain. If NSAID unavoidable, reduce lithium dose 25% and monitor levels.', evidence: 'Level A', onset: '2-5 days', monitoring: 'Lithium levels at 3 days, renal function', alternatives: ['Acetaminophen', 'Aspirin (less effect on lithium)'] },
  { drugA: 'levothyroxine', drugB: 'omeprazole', severity: 'moderate', mechanism: 'PPIs reduce gastric acid needed for levothyroxine absorption', clinicalEffect: 'Decreased levothyroxine absorption by 20-30%, potential hypothyroidism', recommendation: 'Separate administration by 4 hours. Increase levothyroxine dose if TSH remains elevated. Monitor TSH every 6-8 weeks.', evidence: 'Level B', onset: 'Weeks', monitoring: 'TSH at 6 weeks, 12 weeks', alternatives: ['H2 blockers (less impact)', 'Take levothyroxine at bedtime'] },
  { drugA: 'digoxin', drugB: 'amoxicillin', severity: 'mild', mechanism: 'Antibiotics may reduce gut bacteria that metabolize digoxin, slightly increasing bioavailability', clinicalEffect: 'Mild increase in digoxin levels, usually not clinically significant', recommendation: 'Monitor digoxin levels and heart rate. Dose adjustment rarely needed.', evidence: 'Level C', onset: '1-2 weeks', monitoring: 'Digoxin level, HR, ECG', alternatives: [] },
  { drugA: 'simvastatin', drugB: 'ciprofloxacin', severity: 'moderate', mechanism: 'Ciprofloxacin inhibits CYP3A4, increasing simvastatin levels', clinicalEffect: 'Increased risk of myopathy and rhabdomyolysis', recommendation: 'Temporarily discontinue simvastatin during ciprofloxacin course, or use pravastatin/rosuvastatin (not CYP3A4 metabolized).', evidence: 'Level B', onset: 'Days', monitoring: 'CK levels if muscle pain, renal function', alternatives: ['Pravastatin', 'Rosuvastatin', 'Temporarily hold statin'] },
  { drugA: 'prednisone', drugB: 'aspirin', severity: 'moderate', mechanism: 'Corticosteroids increase GI ulcer risk, compounded by NSAID gastrotoxicity', clinicalEffect: 'Increased risk of GI ulceration and bleeding', recommendation: 'Add PPI prophylaxis if combination unavoidable. Use lowest steroid dose for shortest duration.', evidence: 'Level A', onset: 'Days to weeks', monitoring: 'Stool guaiac, Hgb, symptoms of GI bleeding', alternatives: ['Acetaminophen', 'Topical steroids if possible'] },
  { drugA: 'methotrexate', drugB: 'ibuprofen', severity: 'major', mechanism: 'NSAIDs reduce renal methotrexate clearance, increasing toxicity risk', clinicalEffect: 'Methotrexate toxicity: bone marrow suppression, mucositis, hepatotoxicity, renal failure', recommendation: 'AVOID NSAIDs with methotrexate. Use acetaminophen. If NSAID essential, reduce MTX dose and monitor CBC, LFTs, creatinine.', evidence: 'Level A', onset: 'Days', monitoring: 'CBC, LFTs, creatinine before and 1 week after', alternatives: ['Acetaminophen', 'Tramadol (with caution)'] },
  { drugA: 'clopidogrel', drugB: 'omeprazole', severity: 'major', mechanism: 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation by 45%', clinicalEffect: 'Significantly reduced antiplatelet effect, increased cardiovascular event risk', recommendation: 'AVOID omeprazole with clopidogrel. Use pantoprazole (minimal CYP2C19 inhibition) if PPI needed.', evidence: 'Level A', onset: 'Immediate', monitoring: 'Platelet function tests, clinical cardiovascular events', alternatives: ['Pantoprazole', 'H2 blockers (famotidine)'] },
  { drugA: 'warfarin', drugB: 'ciprofloxacin', severity: 'major', mechanism: 'Ciprofloxacin inhibits CYP1A2 and may displace warfarin from protein binding', clinicalEffect: 'Increased INR, significantly elevated bleeding risk', recommendation: 'Avoid combination. If unavoidable, reduce warfarin dose 25% and check INR within 3 days. Consider alternative antibiotic.', evidence: 'Level A', onset: '2-3 days', monitoring: 'INR at day 2, 5, and 7', alternatives: ['Amoxicillin', 'Azithromycin', 'Cephalexin'] },
  { drugA: 'diazepam', drugB: 'sertraline', severity: 'moderate', mechanism: 'Additive CNS depression; sertraline may inhibit CYP3A4 metabolism of diazepam', clinicalEffect: 'Enhanced sedation, respiratory depression risk, impaired coordination', recommendation: 'Use lowest effective doses. Avoid driving. Monitor for excessive sedation. Consider shorter-acting benzo (lorazepam).', evidence: 'Level B', onset: 'Immediate', monitoring: 'Respiratory rate, sedation level, cognitive function', alternatives: ['Lorazepam (no CYP metabolism)', 'Buspirone for anxiety'] },
];

const SEVERITY_CONFIG = {
  major: { label: 'Major', color: '#ef4444', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: '🔴', description: 'Avoid combination — significant harm risk' },
  moderate: { label: 'Moderate', color: '#f59e0b', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: '🟡', description: 'Monitor closely — dose adjustments may be needed' },
  mild: { label: 'Mild', color: '#22c55e', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: '🟢', description: 'Generally safe — routine monitoring sufficient' },
};

const EVIDENCE_LEVELS = { 'Level A': 'Multiple RCTs', 'Level B': 'Limited RCTs / strong observational', 'Level C': 'Case reports / expert opinion' };

/* ─────────────────────── SVG COMPONENTS ─────────────────────── */
function InteractionGraph({ interactions, selectedDrugs }) {
  const width = 400;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 100;

  const drugPositions = {};
  selectedDrugs.forEach((drug, i) => {
    const angle = (i / selectedDrugs.length) * 2 * Math.PI - Math.PI / 2;
    drugPositions[drug.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      {interactions.filter(int => selectedDrugs.some(d => d.id === int.drugA) && selectedDrugs.some(d => d.id === int.drugB)).map((int, i) => {
        const posA = drugPositions[int.drugA];
        const posB = drugPositions[int.drugB];
        if (!posA || !posB) return null;
        const sev = SEVERITY_CONFIG[int.severity];
        return (
          <g key={i}>
            <line x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y} stroke={sev.color} strokeWidth="3" strokeDasharray={int.severity === 'major' ? 'none' : '8,4'} opacity="0.7" />
            <text x={(posA.x + posB.x) / 2} y={(posA.y + posB.y) / 2 - 8} textAnchor="middle" fill={sev.color} fontSize="10" fontWeight="bold">{sev.icon}</text>
          </g>
        );
      })}
      {selectedDrugs.map(drug => {
        const pos = drugPositions[drug.id];
        if (!pos) return null;
        return (
          <g key={drug.id}>
            <circle cx={pos.x} cy={pos.y} r="20" fill={drug.color} opacity="0.2" stroke={drug.color} strokeWidth="2" />
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fill={drug.color} fontSize="9" fontWeight="bold">{drug.name.substring(0, 6)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text}`}>
      {config.icon} {config.label}
    </span>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function DrugInteractionChecker() {
  const [activeTab, setActiveTab] = useState('checker');
  const [selectedDrugIds, setSelectedDrugIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInteraction, setExpandedInteraction] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');

  const selectedDrugs = useMemo(() => DRUGS.filter(d => selectedDrugIds.includes(d.id)), [selectedDrugIds]);

  const foundInteractions = useMemo(() => {
    if (selectedDrugs.length < 2) return [];
    return INTERACTIONS.filter(int =>
      selectedDrugIds.includes(int.drugA) && selectedDrugIds.includes(int.drugB)
    );
  }, [selectedDrugIds, selectedDrugs]);

  const filteredInteractions = useMemo(() => {
    if (severityFilter === 'all') return foundInteractions;
    return foundInteractions.filter(i => i.severity === severityFilter);
  }, [foundInteractions, severityFilter]);

  const filteredDrugs = useMemo(() =>
    DRUGS.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.class.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]);

  const toggleDrug = (drugId) => {
    setSelectedDrugIds(prev => prev.includes(drugId) ? prev.filter(id => id !== drugId) : [...prev, drugId]);
  };

  const severityCounts = useMemo(() => {
    const counts = { major: 0, moderate: 0, mild: 0 };
    foundInteractions.forEach(i => counts[i.severity]++);
    return counts;
  }, [foundInteractions]);

  const tabs = [
    { id: 'checker', label: '💊 Interaction Checker' },
    { id: 'library', label: '📚 Drug Library' },
    { id: 'graph', label: '🕸️ Visual Map' },
  ];

  return (
    <>
      <title>Drug Interaction Checker — OpenPrep AI</title>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        <div>
          <span className="text-xs font-mono font-bold uppercase text-purple-400">.pharmacology</span>
          <h1 className="text-2xl md:text-3xl font-black mt-1">💊 Drug Interaction Checker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check interactions between {DRUGS.length} medications with severity levels, mechanisms, and clinical recommendations</p>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox icon="💊" label="Drugs in Database" value={DRUGS.length} color="#a855f7" />
          <StatBox icon="🔗" label="Known Interactions" value={INTERACTIONS.length} color="#3b82f6" />
          <StatBox icon="🔴" label="Major Interactions" value={INTERACTIONS.filter(i => i.severity === 'major').length} color="#ef4444" />
          <StatBox icon="🟡" label="Moderate Interactions" value={INTERACTIONS.filter(i => i.severity === 'moderate').length} color="#f59e0b" />
        </div>

        {/* TAB NAV */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ CHECKER TAB ═══════════ */}
        {activeTab === 'checker' && (
          <div className="space-y-6">
            {/* DRUG SELECTOR */}
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">🔍 Select Drugs to Check</h3>
              <input type="text" placeholder="Search drugs by name or class..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm mb-3" />
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {filteredDrugs.map(drug => (
                  <button key={drug.id} onClick={() => toggleDrug(drug.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${selectedDrugIds.includes(drug.id) ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-400'}`}>
                    <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: drug.color }} />
                    {drug.name}
                    <span className="text-[9px] text-gray-400 ml-1">({drug.class})</span>
                  </button>
                ))}
              </div>
              {selectedDrugIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Selected:</span>
                  {selectedDrugs.map(d => (
                    <span key={d.id} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-bold">
                      {d.name} <button onClick={() => toggleDrug(d.id)} className="ml-1 text-purple-400 hover:text-red-400">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* RESULTS */}
            {selectedDrugs.length >= 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">⚠️ Found {foundInteractions.length} Interaction{foundInteractions.length !== 1 ? 's' : ''}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setSeverityFilter('all')} className={`px-2 py-1 rounded text-[10px] font-bold ${severityFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>All ({foundInteractions.length})</button>
                    <button onClick={() => setSeverityFilter('major')} className={`px-2 py-1 rounded text-[10px] font-bold ${severityFilter === 'major' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>🔴 Major ({severityCounts.major})</button>
                    <button onClick={() => setSeverityFilter('moderate')} className={`px-2 py-1 rounded text-[10px] font-bold ${severityFilter === 'moderate' ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>🟡 Moderate ({severityCounts.moderate})</button>
                    <button onClick={() => setSeverityFilter('mild')} className={`px-2 py-1 rounded text-[10px] font-bold ${severityFilter === 'mild' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>🟢 Mild ({severityCounts.mild})</button>
                  </div>
                </div>

                {filteredInteractions.map((int, idx) => {
                  const drugA = DRUGS.find(d => d.id === int.drugA);
                  const drugB = DRUGS.find(d => d.id === int.drugB);
                  const sev = SEVERITY_CONFIG[int.severity];
                  const isExpanded = expandedInteraction === idx;
                  return (
                    <div key={idx} className={`bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border ${sev.border} shadow-sm cursor-pointer`} onClick={() => setExpandedInteraction(isExpanded ? null : idx)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: drugA?.color }} />
                            <span className="text-sm font-bold">{drugA?.name}</span>
                          </div>
                          <span className="text-gray-400">⟷</span>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: drugB?.color }} />
                            <span className="text-sm font-bold">{drugB?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={int.severity} />
                          <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{int.mechanism}</p>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-800 pt-4">
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Clinical Effect</div>
                            <p className="text-xs text-gray-300">{int.clinicalEffect}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${sev.bg} border ${sev.border}`}>
                            <div className="text-[10px] uppercase font-bold mb-1" style={{ color: sev.color }}>Recommendation</div>
                            <p className="text-xs text-gray-300">{int.recommendation}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-500 text-[10px]">Evidence</div>
                              <div className="font-bold">{int.evidence}</div>
                              <div className="text-[9px] text-gray-400">{EVIDENCE_LEVELS[int.evidence]}</div>
                            </div>
                            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-500 text-[10px]">Onset</div>
                              <div className="font-bold">{int.onset}</div>
                            </div>
                            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-500 text-[10px]">Monitoring</div>
                              <div className="font-bold">{int.monitoring}</div>
                            </div>
                            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                              <div className="text-gray-500 text-[10px]">Alternatives</div>
                              {int.alternatives.length > 0 ? int.alternatives.map((alt, i) => <div key={i} className="font-bold text-emerald-400">{alt}</div>) : <div className="text-gray-500">None listed</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {foundInteractions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm font-bold">No known interactions between selected drugs</p>
                    <p className="text-xs text-gray-400 mt-1">Always verify with clinical resources</p>
                  </div>
                )}
              </div>
            )}

            {selectedDrugs.length < 2 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💊</div>
                <p className="text-sm font-bold">Select at least 2 drugs to check interactions</p>
                <p className="text-xs text-gray-400 mt-1">Click on drug chips above to add them</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ LIBRARY TAB ═══════════ */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <input type="text" placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDrugs.map(drug => {
                const drugInteractions = INTERACTIONS.filter(i => i.drugA === drug.id || i.drugB === drug.id);
                return (
                  <div key={drug.id} className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: drug.color }} />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold">{drug.name}</h4>
                        <div className="text-[10px] text-gray-500">{drug.class} · {drug.route}</div>
                      </div>
                      <span className="text-xs text-gray-500">{drugInteractions.length} interactions</span>
                    </div>
                    {drugInteractions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {drugInteractions.map((int, i) => {
                          const other = int.drugA === drug.id ? DRUGS.find(d => d.id === int.drugB) : DRUGS.find(d => d.id === int.drugA);
                          return <SeverityBadge key={i} severity={int.severity} />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ GRAPH TAB ═══════════ */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">🕸️ Interaction Network Map</h3>
              {selectedDrugs.length >= 2 ? (
                <InteractionGraph interactions={INTERACTIONS} selectedDrugs={selectedDrugs} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">🕸️</div>
                  <p className="text-xs">Select drugs from the checker tab to see the interaction network</p>
                </div>
              )}
              <div className="flex justify-center gap-4 mt-3">
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1 text-[10px]">
                    <span>{config.icon}</span>
                    <span className="text-gray-500">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {selectedDrugs.length >= 2 && foundInteractions.length > 0 && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">📊 Interaction Summary</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                    <div className="text-lg font-black text-red-400">{severityCounts.major}</div>
                    <div className="text-[10px] text-gray-500">🔴 Major</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                    <div className="text-lg font-black text-amber-400">{severityCounts.moderate}</div>
                    <div className="text-[10px] text-gray-500">🟡 Moderate</div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                    <div className="text-lg font-black text-emerald-400">{severityCounts.mild}</div>
                    <div className="text-[10px] text-gray-500">🟢 Mild</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
