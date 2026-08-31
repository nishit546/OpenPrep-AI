import { useState, useMemo } from 'react';

/* ─────────────────────── MOCK DATA ─────────────────────── */
const SPECIALTIES = [
  { id: 'cardiology', name: 'Cardiology', icon: '❤️', color: '#ef4444', cases: 24 },
  { id: 'neurology', name: 'Neurology', icon: '🧠', color: '#a855f7', cases: 18 },
  { id: 'oncology', name: 'Oncology', icon: '🔬', color: '#f59e0b', cases: 15 },
  { id: 'emergency', name: 'Emergency Medicine', icon: '🚑', color: '#ef4444', cases: 22 },
  { id: 'pediatrics', name: 'Pediatrics', icon: '👶', color: '#06b6d4', cases: 16 },
  { id: 'infectious', name: 'Infectious Disease', icon: '🦠', color: '#22c55e', cases: 14 },
  { id: 'pulmonology', name: 'Pulmonology', icon: '🫁', color: '#3b82f6', cases: 12 },
  { id: 'gastro', name: 'Gastroenterology', icon: '🩺', color: '#ec4899', cases: 11 },
];

const CASES = [
  {
    id: 1, specialty: 'cardiology', difficulty: 'Advanced', title: 'Chest Pain in a 58-Year-Old Male',
    chiefComplaint: 'Substernal chest pain radiating to the left arm, onset 2 hours ago',
    patientProfile: { age: 58, sex: 'Male', bmi: 28.5, smoker: true, hypertension: true, diabetes: false, familyHistory: 'Father - MI at age 55' },
    vitals: { bp: '152/94', hr: 102, rr: 20, temp: '36.8°C', spo2: '96%', pain: '7/10' },
    labResults: { troponinI: '0.45 ng/mL (↑)', bnp: '180 pg/mL', cholesterol: '260 mg/dL', glucose: '142 mg/dL', creatinine: '1.0 mg/dL', wbc: '11.2k/μL' },
    ecgFindings: 'ST elevation in leads II, III, aVF. Reciprocal depression in I, aVL.',
    diagnosis: 'ST-Elevation Myocardial Infarction (STEMI)',
    differentials: [
      { diagnosis: 'STEMI', correct: true, confidence: 95 },
      { diagnosis: 'Unstable Angina', correct: false, confidence: 15 },
      { diagnosis: 'Aortic Dissection', correct: false, confidence: 8 },
      { diagnosis: 'Pulmonary Embolism', correct: false, confidence: 5 },
      { diagnosis: 'GERD', correct: false, confidence: 2 },
    ],
    managementSteps: ['Activate cath lab immediately', 'Aspirin 325mg chewed', 'Heparin bolus 60 units/kg IV', 'Primary PCI within 90 minutes', 'Dual antiplatelet therapy'],
    pearls: ['Time is muscle — door-to-balloon time <90 min', 'Troponin may be normal in first 2-3 hours', 'Always get right-sided ECG if inferior STEMI suspected'],
    outcome: 'Successful PCI with stent placement. Troponin peaked at 18h. Discharged Day 3.',
    timeLimit: 600, passingScore: 70, attempts: 342, avgScore: 68, rating: 4.8,
  },
  {
    id: 2, specialty: 'neurology', difficulty: 'Expert', title: 'Sudden Onset Hemiplegia',
    chiefComplaint: 'Acute onset right-sided weakness and speech difficulty, onset 45 minutes ago',
    patientProfile: { age: 72, sex: 'Female', bmi: 24.1, smoker: false, hypertension: true, diabetes: true, familyHistory: 'Mother - Stroke at age 80' },
    vitals: { bp: '178/102', hr: 88, rr: 16, temp: '36.6°C', spo2: '98%', pain: '2/10' },
    labResults: { glucose: '210 mg/dL', inr: '1.1', platelets: '245k/μL', creatinine: '0.9 mg/dL', wbc: '8.5k/μL' },
    ecgFindings: 'Atrial fibrillation with rapid ventricular response. Rate ~110.',
    diagnosis: 'Acute Ischemic Stroke — Left MCA Territory (Cardioembolic)',
    differentials: [
      { diagnosis: 'Ischemic Stroke (Cardioembolic)', correct: true, confidence: 90 },
      { diagnosis: 'Hemorrhagic Stroke', correct: false, confidence: 12 },
      { diagnosis: 'TIA', correct: false, confidence: 8 },
      { diagnosis: 'Todd\'s Paralysis', correct: false, confidence: 3 },
      { diagnosis: 'Brain Tumor', correct: false, confidence: 2 },
    ],
    managementSteps: ['CT head non-contrast to rule out hemorrhage', 'NIHSS assessment (score 16)', 'IV alteplase within 4.5 hours window', 'Blood pressure management <185/110', 'Start anticoagulation after 24h if no hemorrhage'],
    pearls: ['NIHSS score guides tPA eligibility', 'AFib is the most common cause of cardioembolic stroke', 'Time window: tPA <4.5h, thrombectomy <24h with perfusion imaging'],
    outcome: 'tPA administered at 52 min from onset. Mild improvement at 24h. Started on apixaban Day 2.',
    timeLimit: 600, passingScore: 75, attempts: 215, avgScore: 62, rating: 4.9,
  },
  {
    id: 3, specialty: 'emergency', difficulty: 'Intermediate', title: 'Anaphylaxis in the Emergency Department',
    chiefComplaint: 'Acute onset urticaria, dyspnea, and hypotension after eating peanuts',
    patientProfile: { age: 24, sex: 'Female', bmi: 22.0, smoker: false, hypertension: false, diabetes: false, familyHistory: 'Asthma' },
    vitals: { bp: '82/54', hr: 130, rr: 28, temp: '37.2°C', spo2: '91%', pain: '5/10' },
    labResults: { tryptase: '12.5 ng/mL (↑↑)', glucose: '110 mg/dL', lactate: '2.8 mmol/L', wbc: '14.2k/μL' },
    ecgFindings: 'Sinus tachycardia. No ST changes.',
    diagnosis: 'Anaphylaxis — Food (Peanut) Trigger',
    differentials: [
      { diagnosis: 'Anaphylaxis', correct: true, confidence: 98 },
      { diagnosis: 'Asthma Exacerbation', correct: false, confidence: 10 },
      { diagnosis: 'Cardiogenic Shock', correct: false, confidence: 5 },
      { diagnosis: 'Panic Attack', correct: false, confidence: 8 },
      { diagnosis: 'Massive PE', correct: false, confidence: 3 },
    ],
    managementSteps: ['IM Epinephrine 0.5mg lateral thigh (FIRST LINE)', 'IV normal saline 1L bolus', 'Diphenhydramine 50mg IV', 'Albuterol nebulizer for bronchospasm', 'Observe 4-6 hours for biphasic reaction', 'Prescribe epinepen auto-injector'],
    pearls: ['Epinephrine is FIRST-LINE — never delay for other treatments', 'Biphasic reactions occur in 1-20% of cases', 'Tryptase confirms anaphylaxis retrospectively'],
    outcome: 'Epinephrine given at T+2min. BP normalized at T+15min. Observed 6h. Discharged with epinepen.',
    timeLimit: 300, passingScore: 65, attempts: 528, avgScore: 74, rating: 4.7,
  },
  {
    id: 4, specialty: 'infectious', difficulty: 'Advanced', title: 'Fever with Rash After Travel to Southeast Asia',
    chiefComplaint: 'High fever (39.5°C), maculopapular rash, and retro-orbital pain for 3 days after returning from Thailand',
    patientProfile: { age: 31, sex: 'Male', bmi: 23.8, smoker: false, hypertension: false, diabetes: false, familyHistory: 'None significant' },
    vitals: { bp: '110/70', hr: 95, rr: 18, temp: '39.5°C', spo2: '98%', pain: '6/10' },
    labResults: { platelets: '92k/μL (↓↓)', wbc: '3.8k/μL (↓)', hematocrit: '38%', ns1Ag: 'Positive', igM: 'Positive' },
    ecgFindings: 'Normal sinus rhythm. No abnormalities.',
    diagnosis: 'Dengue Fever with Warning Signs',
    differentials: [
      { diagnosis: 'Dengue Fever', correct: true, confidence: 92 },
      { diagnosis: 'Chikungunya', correct: false, confidence: 15 },
      { diagnosis: 'Zika Virus', correct: false, confidence: 8 },
      { diagnosis: 'Malaria', correct: false, confidence: 12 },
      { diagnosis: 'Rickettsial Infection', correct: false, confidence: 5 },
    ],
    managementSteps: ['IV fluid resuscitation (NS at 20 mL/kg/hr)', 'Strict fluid balance monitoring', 'Avoid NSAIDs — use acetaminophen only', 'Serial CBC every 6 hours', 'Watch for warning signs: bleeding, hepatomegaly, pleural effusion', 'Dengue classification: Warning signs present'],
    pearls: ['Critical phase occurs when fever subsides (day 3-7)', 'Platelet nadir typically on day 5-7', 'NSAIDs contraindicated — risk of hemorrhage', 'Leakage syndrome can cause shock 24-48h after defervescence'],
    outcome: 'Hospitalized for IV fluids. Platelets nadir 68k on Day 5. Discharged Day 7 fully recovered.',
    timeLimit: 600, passingScore: 70, attempts: 189, avgScore: 59, rating: 4.8,
  },
  {
    id: 5, specialty: 'pediatrics', difficulty: 'Intermediate', title: 'Febrile Seizure in a 2-Year-Old',
    chiefComplaint: 'Generalized tonic-clonic seizure lasting 3 minutes with fever of 39.8°C',
    patientProfile: { age: 2, sex: 'Male', bmi: 16.2, smoker: false, hypertension: false, diabetes: false, familyHistory: 'Mother had febrile seizures as child' },
    vitals: { bp: '90/55', hr: 140, rr: 28, temp: '39.8°C', spo2: '97%', pain: 'N/A' },
    labResults: { wbc: '15.2k/μL', crp: '28 mg/L (↑)', glucose: '95 mg/dL', electrolytes: 'Normal', cultures: 'Pending' },
    ecgFindings: 'N/A — not indicated for simple febrile seizure',
    diagnosis: 'Simple Febrile Seizure with Otitis Media',
    differentials: [
      { diagnosis: 'Simple Febrile Seizure', correct: true, confidence: 88 },
      { diagnosis: 'Febrile Status Epilepticus', correct: false, confidence: 5 },
      { diagnosis: 'Meningitis', correct: false, confidence: 10 },
      { diagnosis: 'Epilepsy', correct: false, confidence: 3 },
      { diagnosis: 'Intracranial Abscess', correct: false, confidence: 2 },
    ],
    managementSteps: ['Stabilize airway, breathing, circulation', 'Rectal diazepam if seizure >5 min', 'Cool the child (tepid sponging)', 'Acetaminophen 15mg/kg for fever', 'Detailed ear examination (found bulging TM)', 'Diagnose acute otitis media', 'Start amoxicillin 80mg/kg/day'],
    pearls: ['Febrile seizures affect 2-5% of children aged 6 months to 5 years', 'Simple febrile seizures are benign and do NOT indicate epilepsy', 'Always rule out meningitis if signs of meningeal irritation present'],
    outcome: 'Seizure self-terminated at 3 min. Otitis media confirmed. Amoxicillin started. No recurrence.',
    timeLimit: 450, passingScore: 65, attempts: 275, avgScore: 72, rating: 4.6,
  },
];

const USER_PROGRESS = {
  totalCases: 156,
  completed: 89,
  correctDiagnoses: 74,
  avgTime: '4:32',
  streak: 12,
  rank: 'Senior Resident',
  level: 18,
  xp: 4850,
  nextLevelXp: 5000,
  badges: [
    { name: 'Differential Master', icon: '🎯', desc: 'Correctly identified 50+ differentials', earned: true },
    { name: 'Speed Diagnostician', icon: '⚡', desc: 'Completed 10 cases under 3 minutes', earned: true },
    { name: 'Cardiology Expert', icon: '❤️', desc: 'Completed 20 cardiac cases with >80% score', earned: true },
    { name: 'Emergency Hero', icon: '🚑', desc: 'Perfect score on 5 emergency cases', earned: false },
    { name: 'Neuro Navigator', icon: '🧠', desc: 'Completed all neurology cases', earned: false },
    { name: 'Case Marathoner', icon: '🏃', desc: 'Complete 100 cases total', earned: false },
  ],
  recentScores: [78, 85, 72, 90, 68, 82, 95, 76, 88, 70],
};

const SPECIALTY_LEADERBOARD = [
  { rank: 1, name: 'Dr. Aarav K.', score: 9850, cases: 245, avatar: '👨‍⚕️' },
  { rank: 2, name: 'Dr. Meera P.', score: 9200, cases: 210, avatar: '👩‍⚕️' },
  { rank: 3, name: 'Dr. Rahul S.', score: 8800, cases: 195, avatar: '👨‍⚕️' },
  { rank: 4, name: 'Dr. Priya M.', score: 8400, cases: 180, avatar: '👩‍⚕️' },
  { rank: 5, name: 'You', score: 4850, cases: 89, avatar: '🧑‍⚕️' },
];

/* ─────────────────────── SVG CHART COMPONENTS ─────────────────────── */
function ScoreRing({ value, size = 80, strokeWidth = 6, label }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#3b82f6' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="text-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#374151" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="16" fontWeight="bold" className="transform rotate-90" style={{ transformOrigin: 'center' }}>{value}%</text>
      </svg>
      {label && <div className="text-[10px] text-gray-500 mt-1">{label}</div>}
    </div>
  );
}

function TrendChart({ data, color = '#a855f7', height = 60 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 10 - ((v - min) / range) * (height - 20)}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <defs><linearGradient id={`trend-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={areaPoints} fill={`url(#trend-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function MedicalCaseSimulator() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [showResult, setShowResult] = useState(false);
  const [userDiagnosis, setUserDiagnosis] = useState('');
  const [selectedDifferentials, setSelectedDifferentials] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const filteredCases = useMemo(() =>
    CASES.filter(c => {
      if (selectedSpecialty !== 'All' && c.specialty !== selectedSpecialty) return false;
      if (selectedDifficulty !== 'All' && c.difficulty !== selectedDifficulty) return false;
      return true;
    }), [selectedSpecialty, selectedDifficulty]);

  const xpProgress = Math.round((USER_PROGRESS.xp / USER_PROGRESS.nextLevelXp) * 100);
  const accuracy = USER_PROGRESS.completed > 0 ? Math.round((USER_PROGRESS.correctDiagnoses / USER_PROGRESS.completed) * 100) : 0;

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'cases', label: '📋 Cases' },
    { id: 'leaderboard', label: '🏆 Leaderboard' },
    { id: 'badges', label: '🎖️ Badges' },
  ];

  const handleStartCase = (c) => {
    setSelectedCase(c);
    setCurrentStep(0);
    setShowResult(false);
    setUserDiagnosis('');
    setSelectedDifferentials([]);
    setActiveTab('case');
  };

  const handleSubmitDiagnosis = () => {
    setShowResult(true);
  };

  return (
    <>
      <title>Medical Case Simulator — OpenPrep AI</title>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase text-purple-400">.clinical trainer</span>
            <h1 className="text-2xl md:text-3xl font-black mt-1">🩺 Medical Case Simulator</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Practice clinical reasoning with {CASES.length}+ real-world patient cases across {SPECIALTIES.length} specialties</p>
          </div>
          <ScoreRing value={xpProgress} size={70} strokeWidth={5} label={`Level ${USER_PROGRESS.level}`} />
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="📋" label="Cases Done" value={USER_PROGRESS.completed} sub={`of ${USER_PROGRESS.totalCases}`} color="#a855f7" />
          <StatCard icon="✅" label="Accuracy" value={`${accuracy}%`} sub={`${USER_PROGRESS.correctDiagnoses} correct`} color="#22c55e" />
          <StatCard icon="⚡" label="Avg Time" value={USER_PROGRESS.avgTime} sub="per case" color="#3b82f6" />
          <StatCard icon="🔥" label="Streak" value={USER_PROGRESS.streak} sub="consecutive" color="#f59e0b" />
          <StatCard icon="⭐" label="XP" value={USER_PROGRESS.xp} sub={`${USER_PROGRESS.nextLevelXp - USER_PROGRESS.xp} to next level`} color="#ec4899" />
        </div>

        {/* TAB NAV */}
        {activeTab !== 'case' && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════ DASHBOARD TAB ═══════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">📈 Recent Performance</h3>
              <TrendChart data={USER_PROGRESS.recentScores} height={80} />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                {USER_PROGRESS.recentScores.map((_, i) => <span key={i}>Case {i + 1}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SPECIALTIES.slice(0, 8).map(sp => {
                const spCases = CASES.filter(c => c.specialty === sp.id);
                return (
                  <button key={sp.id} onClick={() => { setSelectedSpecialty(sp.id); setActiveTab('cases'); }}
                    className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center hover:border-purple-500/50 transition">
                    <div className="text-2xl mb-1">{sp.icon}</div>
                    <div className="text-xs font-bold">{sp.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{sp.cases} cases · {spCases.length} available</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ CASES TAB ═══════════ */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                <option value="All">All Specialties</option>
                {SPECIALTIES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                <option value="All">All Difficulties</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div className="space-y-3">
              {filteredCases.map(c => {
                const sp = SPECIALTIES.find(s => s.id === c.specialty);
                const diffColors = { Intermediate: 'bg-blue-500/20 text-blue-400', Advanced: 'bg-amber-500/20 text-amber-400', Expert: 'bg-red-500/20 text-red-400' };
                return (
                  <div key={c.id} className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-purple-500/50 transition cursor-pointer" onClick={() => handleStartCase(c)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{sp?.icon}</span>
                          <span className="text-[10px] text-gray-500">{sp?.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diffColors[c.difficulty]}`}>{c.difficulty}</span>
                        </div>
                        <h3 className="text-sm font-bold">{c.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{c.chiefComplaint}</p>
                        <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
                          <span>⏱️ {Math.floor(c.timeLimit / 60)} min</span>
                          <span>📊 {c.passingScore}% to pass</span>
                          <span>👥 {c.attempts} attempts</span>
                          <span>⭐ {c.rating}/5</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition">Start →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ CASE SIMULATION TAB ═══════════ */}
        {activeTab === 'case' && selectedCase && (
          <div className="space-y-4">
            <button onClick={() => setActiveTab('cases')} className="text-sm text-purple-400 hover:text-purple-300">← Back to Cases</button>
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span>{SPECIALTIES.find(s => s.id === selectedCase.specialty)?.icon}</span>
                <span className="text-xs text-gray-500">{selectedCase.difficulty}</span>
              </div>
              <h2 className="text-lg font-bold">{selectedCase.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedCase.chiefComplaint}</p>
            </div>

            {/* PATIENT INFO STEPS */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['Patient Profile', 'Vitals', 'Labs', 'ECG'].map((step, i) => (
                <button key={step} onClick={() => setCurrentStep(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${currentStep === i ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                  {step}
                </button>
              ))}
              <button onClick={() => setCurrentStep(4)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${currentStep === 4 ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>Diagnosis</button>
            </div>

            {currentStep === 0 && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">👤 Patient Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {Object.entries(selectedCase.patientProfile).map(([k, v]) => (
                    <div key={k} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                      <span className="font-bold">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">📊 Vital Signs</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {Object.entries(selectedCase.vitals).map(([k, v]) => (
                    <div key={k} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-center">
                      <div className="text-gray-500 uppercase">{k}</div>
                      <div className="text-sm font-bold mt-1">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">🧪 Lab Results</h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(selectedCase.labResults).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                      <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`font-bold ${v.includes('↑') ? 'text-red-400' : v.includes('↓') ? 'text-blue-400' : ''}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">💓 ECG Findings</h3>
                <p className="text-sm text-gray-300">{selectedCase.ecgFindings}</p>
              </div>
            )}

            {currentStep === 4 && !showResult && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold">🔬 Your Differential Diagnoses</h3>
                <p className="text-xs text-gray-500">Select all differentials you consider and enter your primary diagnosis:</p>
                <div className="space-y-2">
                  {selectedCase.differentials.map(d => (
                    <label key={d.diagnosis} className="flex items-center gap-3 p-3 bg-gray-200 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                      <input type="checkbox" checked={selectedDifferentials.includes(d.diagnosis)}
                        onChange={e => {
                          if (e.target.checked) setSelectedDifferentials([...selectedDifferentials, d.diagnosis]);
                          else setSelectedDifferentials(selectedDifferentials.filter(x => x !== d.diagnosis));
                        }}
                        className="w-4 h-4 rounded" />
                      <span className="text-xs font-bold flex-1">{d.diagnosis}</span>
                    </label>
                  ))}
                </div>
                <input type="text" value={userDiagnosis} onChange={e => setUserDiagnosis(e.target.value)}
                  placeholder="Enter your primary diagnosis..."
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm" />
                <button onClick={handleSubmitDiagnosis}
                  className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition">
                  Submit Diagnosis ✅
                </button>
              </div>
            )}

            {showResult && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border-2 ${userDiagnosis.toLowerCase().includes('stemi') || userDiagnosis.toLowerCase().includes('stroke') || userDiagnosis.toLowerCase().includes('anaphylaxis') || userDiagnosis.toLowerCase().includes('dengue') || userDiagnosis.toLowerCase().includes('febrile') ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
                  <h3 className="text-sm font-bold mb-2">
                    {userDiagnosis.toLowerCase().includes(selectedCase.diagnosis.toLowerCase().split('—')[0].toLowerCase().split(' ')[0]) ? '✅ Correct Diagnosis!' : '⚠️ Review Needed'}
                  </h3>
                  <p className="text-xs text-gray-300">Correct answer: <span className="font-bold text-emerald-400">{selectedCase.diagnosis}</span></p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <h3 className="text-sm font-bold mb-3">📝 Management Steps</h3>
                  <div className="space-y-2">
                    {selectedCase.managementSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                        <span className="text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <h3 className="text-sm font-bold mb-3">💡 Clinical Pearls</h3>
                  <div className="space-y-2">
                    {selectedCase.pearls.map((p, i) => (
                      <div key={i} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">💎 {p}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                  <h3 className="text-xs font-bold mb-1">🏥 Outcome</h3>
                  <p className="text-xs text-gray-400">{selectedCase.outcome}</p>
                </div>
                <button onClick={() => { setActiveTab('cases'); setSelectedCase(null); }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                  Back to Cases
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ LEADERBOARD TAB ═══════════ */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">🏆 Global Leaderboard</h3>
              <div className="space-y-2">
                {SPECIALTY_LEADERBOARD.map(p => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={p.rank} className={`flex items-center gap-3 p-3 rounded-xl ${p.name === 'You' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-gray-200 dark:bg-gray-800'}`}>
                      <span className="text-lg font-bold w-8 text-center">{p.rank <= 3 ? medals[p.rank - 1] : `#${p.rank}`}</span>
                      <span className="text-xl">{p.avatar}</span>
                      <div className="flex-1">
                        <div className="text-xs font-bold">{p.name}</div>
                        <div className="text-[10px] text-gray-500">{p.cases} cases</div>
                      </div>
                      <div className="text-sm font-bold text-purple-400">{p.score.toLocaleString()} XP</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ BADGES TAB ═══════════ */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {USER_PROGRESS.badges.map(b => (
              <div key={b.name} className={`p-5 rounded-2xl border text-center ${b.earned ? 'bg-gray-100 dark:bg-gray-900/50 border-purple-500/30' : 'bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-50'}`}>
                <div className="text-3xl mb-2">{b.icon}</div>
                <h4 className="text-sm font-bold">{b.name}</h4>
                <p className="text-[10px] text-gray-500 mt-1">{b.desc}</p>
                {b.earned ? (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">✓ Earned</span>
                ) : (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-500/20 text-gray-500 rounded text-[10px] font-bold">🔒 Locked</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
