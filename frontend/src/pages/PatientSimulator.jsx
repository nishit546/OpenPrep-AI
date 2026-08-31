import { useState, useMemo, useEffect, useCallback } from 'react';

/* ─────────────────────── MOCK DATA ─────────────────────── */
const SCENARIOS = [
  {
    id: 1, title: 'Acute MI in the ED', difficulty: 'Advanced', specialty: 'Cardiology', icon: '❤️', color: '#ef4444',
    patient: { name: 'John M.', age: 58, sex: 'Male', weight: '88 kg', allergies: ['Penicillin'], history: ['HTN', 'Hyperlipidemia', 'Smoker'] },
    presentingVitals: { hr: 102, bp: '152/94', rr: 20, temp: 36.8, spo2: 96, pain: 7 },
    stages: [
      { id: 1, title: 'Initial Assessment', vitals: { hr: 102, bp: '152/94', rr: 20, temp: 36.8, spo2: 96, pain: 7 }, prompt: 'Patient presents with substernal chest pain radiating to left arm, diaphoresis, nausea. Onset 2 hours ago.', options: [
        { id: 'a', text: 'Order 12-lead ECG, troponin, CBC, BMP, chest X-ray', correct: true, feedback: 'Correct! ECG and cardiac biomarkers are essential first steps for suspected ACS.' },
        { id: 'b', text: 'Administer morphine 4mg IV for pain', correct: false, feedback: 'Pain management is important, but diagnostic workup should come first to guide treatment.' },
        { id: 'c', text: 'Start IV fluids and observe', correct: false, feedback: 'Observation is not appropriate for suspected ACS — this delays critical treatment.' },
      ]},
      { id: 2, title: 'ECG Results', vitals: { hr: 108, bp: '148/92', rr: 22, temp: 36.9, spo2: 95, pain: 8 }, prompt: 'ECG shows ST elevation in leads II, III, aVF with reciprocal changes in I, aVL. Troponin: 0.45 ng/mL (↑). Diagnosis: Inferior STEMI.', options: [
        { id: 'a', text: 'Activate cath lab for emergent PCI, give aspirin 325mg + heparin', correct: true, feedback: 'Correct! Primary PCI is the gold standard for STEMI. Door-to-balloon time <90 min.' },
        { id: 'b', text: 'Start thrombolytics (alteplase)', correct: false, feedback: 'PCI is preferred over thrombolytics when available within 120 minutes.' },
        { id: 'c', text: 'Order echocardiogram and cardiology consult', correct: false, feedback: 'While echo is useful, activating the cath lab is the time-critical priority.' },
      ]},
      { id: 3, title: 'Post-PCI Management', vitals: { hr: 78, bp: '128/80', rr: 16, temp: 37.0, spo2: 98, pain: 3 }, prompt: 'Successful PCI with drug-eluting stent placed in RCA. Patient now in CCU. Vitals stable. What is the next critical step?', options: [
        { id: 'a', text: 'Start dual antiplatelet therapy (aspirin + clopidogrel), statin, beta-blocker', correct: true, feedback: 'Correct! DAPT is essential post-PCI. Avoid PPIs with clopidogrel (use pantoprazole).' },
        { id: 'b', text: 'Continue current medications, no changes needed', correct: false, feedback: 'Post-ACS patients need optimized medical therapy including DAPT, high-intensity statin, and beta-blocker.' },
        { id: 'c', text: 'Discharge in 24 hours with outpatient follow-up', correct: false, feedback: 'Minimum 48-72h hospital stay post-STEMI. Patient needs cardiac rehab enrollment.' },
      ]},
    ],
    completionCriteria: 'Correctly manage STEMI from presentation through post-PCI care',
  },
  {
    id: 2, title: 'Sepsis Recognition & Management', difficulty: 'Expert', specialty: 'Emergency', icon: '🚑', color: '#f59e0b',
    patient: { name: 'Mary S.', age: 67, sex: 'Female', weight: '62 kg', allergies: ['Sulfa drugs'], history: ['Type 2 DM', 'CKD Stage 3'] },
    presentingVitals: { hr: 118, bp: '88/52', rr: 26, temp: 39.2, spo2: 93, pain: 4 },
    stages: [
      { id: 1, title: 'Recognition', vitals: { hr: 118, bp: '88/52', rr: 26, temp: 39.2, spo2: 93, pain: 4 }, prompt: '67F with fever, tachycardia, hypotension. WBC 22k, lactate 4.2 mmol/L. Suspected sepsis from UTI source.', options: [
        { id: 'a', text: 'Start 30mL/kg NS bolus, broad-spectrum antibiotics within 1 hour, lactate level', correct: true, feedback: 'Correct! Hour-1 sepsis bundle: fluids + antibiotics + lactate within 60 minutes.' },
        { id: 'b', text: 'Order blood cultures first, then decide on fluids', correct: false, feedback: 'Cultures are important but should not delay fluid resuscitation or antibiotics in sepsis.' },
        { id: 'c', text: 'Start vasopressors immediately', correct: false, feedback: 'Vasopressors are second-line after fluid resuscitation fails to restore perfusion.' },
      ]},
      { id: 2, title: 'Resuscitation', vitals: { hr: 110, bp: '82/48', rr: 28, temp: 38.8, spo2: 91, pain: 4 }, prompt: 'After 2L NS, BP remains 82/48. Lactate: 5.1 (worsening). Urine output: 15mL/hr. Patient confused.', options: [
        { id: 'a', text: 'Start norepinephrine, repeat fluid bolus, consider ICU transfer', correct: true, feedback: 'Correct! Vasopressors are indicated when MAP <65 despite adequate fluid resuscitation.' },
        { id: 'b', text: 'Give more fluids aggressively (5L total)', correct: false, feedback: 'Fluid overload in sepsis causes pulmonary edema. Vasopressors are more appropriate at this stage.' },
        { id: 'c', text: 'Switch antibiotics', correct: false, feedback: 'Antibiotic optimization is important, but hemodynamic support is the immediate priority.' },
      ]},
      { id: 3, title: 'ICU Management', vitals: { hr: 88, bp: '105/65', rr: 18, temp: 37.6, spo2: 97, pain: 2 }, prompt: 'On norepinephrine, MAP now 72. Blood cultures: E. coli. Sensitivities pending. Creatinine rising (1.8 → 2.4). Lactate trending down to 2.8.', options: [
        { id: 'a', text: 'Tailor antibiotics based on sensitivities when available, continue supportive care', correct: true, feedback: 'Correct! De-escalation based on culture results is a key sepsis management principle.' },
        { id: 'b', text: 'Add vancomycin for broader coverage', correct: false, feedback: 'Broadening without evidence of gram-positive infection wastes resources and risks resistance.' },
        { id: 'c', text: 'Start dialysis immediately', correct: false, feedback: 'Acute kidney injury in sepsis often improves with resuscitation. Dialysis is for refractory cases.' },
      ]},
    ],
    completionCriteria: 'Follow sepsis bundle and manage hemodynamic instability appropriately',
  },
  {
    id: 3, title: 'Pediatric Asthma Exacerbation', difficulty: 'Intermediate', specialty: 'Pediatrics', icon: '👶', color: '#3b82f6',
    patient: { name: 'Leo K.', age: 6, sex: 'Male', weight: '22 kg', allergies: ['Aspirin'], history: ['Moderate persistent asthma', 'Exercise-induced'] },
    presentingVitals: { hr: 140, bp: '95/60', rr: 36, temp: 37.1, spo2: 89, pain: 3 },
    stages: [
      { id: 1, title: 'Initial Assessment', vitals: { hr: 140, bp: '95/60', rr: 36, temp: 37.1, spo2: 89, pain: 3 }, prompt: '6yo boy with severe asthma exacerbation. Can only speak 2-3 words at a time. Wheezing bilaterally. Accessory muscle use. SpO2 89%.', options: [
        { id: 'a', text: 'Start continuous nebulized albuterol, supplemental O2, systemic corticosteroids', correct: true, feedback: 'Correct! Severe exacerbation requires continuous nebulization + O2 + systemic steroids.' },
        { id: 'b', text: 'Give oral albuterol and observe', correct: false, feedback: 'Oral routes are too slow for severe exacerbations. Nebulized bronchodilators are first-line.' },
        { id: 'c', text: 'Start IV magnesium sulfate', correct: false, feedback: 'IV mag is third-line for near-fatal asthma, not first-line for severe exacerbation.' },
      ]},
      { id: 2, title: 'Reassessment', vitals: { hr: 120, bp: '100/62', rr: 30, temp: 37.0, spo2: 94, pain: 2 }, prompt: 'After 1 hour of continuous albuterol + O2 + prednisolone: speaking in sentences, SpO2 improved to 94%, still wheezing but less severe.', options: [
        { id: 'a', text: 'Switch to intermittent nebulized albuterol Q20min, continue O2, repeat prednisolone in 4-6 hours', correct: true, feedback: 'Correct! Step-down from continuous to intermittent nebulization with ongoing monitoring.' },
        { id: 'b', text: 'Discharge with inhaler prescription', correct: false, feedback: 'Not yet ready for discharge — needs further observation and stabilization.' },
        { id: 'c', text: 'Start IV salbutamol', correct: false, feedback: 'IV salbutamol is rarely needed and reserved for life-threatening cases unresponsive to nebulization.' },
      ]},
      { id: 3, title: 'Discharge Planning', vitals: { hr: 95, bp: '102/64', rr: 22, temp: 36.9, spo2: 97, pain: 0 }, prompt: 'Patient stable, speaking normally, SpO2 97%, minimal wheezing. Ready for discharge planning.', options: [
        { id: 'a', text: 'Prescribe ICS + LABA maintenance, rescue inhaler, asthma action plan, follow-up in 1 week', correct: true, feedback: 'Correct! Comprehensive discharge: controller therapy + action plan + follow-up.' },
        { id: 'b', text: 'Discharge with rescue inhaler only', correct: false, feedback: 'Moderate persistent asthma requires controller therapy, not just rescue inhaler.' },
        { id: 'c', text: 'Start oral prednisolone taper at home', correct: false, feedback: 'A short course was given in ED. A full taper is only needed for severe/prolonged exacerbations.' },
      ]},
    ],
    completionCriteria: 'Appropriately manage pediatric asthma escalation and discharge',
  },
];

const VITAL_RANGES = {
  hr: { normal: [60, 100], unit: 'bpm', icon: '❤️', color: '#ef4444' },
  bp: { normal: '120/80', unit: 'mmHg', icon: '🩺', color: '#3b82f6' },
  rr: { normal: [12, 20], unit: '/min', icon: '🫁', color: '#22c55e' },
  temp: { normal: [36.1, 37.2], unit: '°C', icon: '🌡️', color: '#f59e0b' },
  spo2: { normal: [95, 100], unit: '%', icon: '💧', color: '#06b6d4' },
  pain: { normal: [0, 3], unit: '/10', icon: '😣', color: '#a855f7' },
};

function getVitalStatus(key, value) {
  if (key === 'bp') {
    const [sys, dia] = value.split('/').map(Number);
    if (sys > 140 || dia > 90) return 'critical';
    if (sys > 130 || dia > 85) return 'warning';
    return 'normal';
  }
  const [low, high] = VITAL_RANGES[key]?.normal || [0, 100];
  if (value < low * 0.8 || value > high * 1.3) return 'critical';
  if (value < low || value > high) return 'warning';
  return 'normal';
}

const STATUS_COLORS = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };

/* ─────────────────────── SVG COMPONENTS ─────────────────────── */
function VitalGauge({ label, value, unit, icon, color, status }) {
  const sColor = STATUS_COLORS[status];
  return (
    <div className={`p-3 rounded-xl border ${status === 'critical' ? 'border-red-500/50 bg-red-500/10' : status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50'} text-center transition-all`}>
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-xl font-black" style={{ color: sColor }}>{value}</div>
      <div className="text-[10px] text-gray-500">{unit}</div>
      <div className="text-[10px] font-bold mt-0.5" style={{ color: sColor }}>{label}</div>
    </div>
  );
}

function EKGLine({ hr, width = 300, height = 60 }) {
  const period = 60000 / hr;
  const points = [];
  for (let x = 0; x < width; x += 2) {
    const t = (x / width) * 3 * period;
    const phase = (t % period) / period;
    let y = height / 2;
    if (phase < 0.05) y = height / 2 - 2;
    else if (phase < 0.1) y = height / 2 + 3;
    else if (phase < 0.15) y = height / 2 - height * 0.35;
    else if (phase < 0.2) y = height / 2 + 5;
    else if (phase < 0.25) y = height / 2;
    else if (phase < 0.35) y = height / 2 - 8;
    else if (phase < 0.5) y = height / 2;
    points.push(`${x},${y}`);
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <polyline points={points.join(' ')} fill="none" stroke="#22c55e" strokeWidth="1.5" />
    </svg>
  );
}

function ProgressTracker({ current, total }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < current ? 'bg-purple-500' : i === current ? 'bg-purple-300' : 'bg-gray-300 dark:bg-gray-700'}`} />
      ))}
    </div>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function PatientSimulator() {
  const [activeTab, setActiveTab] = useState('scenarios');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const scenario = selectedScenario ? SCENARIOS.find(s => s.id === selectedScenario) : null;
  const stage = scenario?.stages[currentStage];

  const handleAnswer = (option) => {
    setSelectedAnswer(option);
    setSelectedOption(option.id);
    setShowFeedback(true);
    if (option.correct) setScore(s => s + 1);
  };

  const handleNextStage = () => {
    if (currentStage < scenario.stages.length - 1) {
      setCurrentStage(s => s + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setSelectedAnswer(null);
    } else {
      setCompletedScenarios([...completedScenarios, { id: scenario.id, score: score + (selectedAnswer?.correct ? 1 : 0), total: scenario.stages.length }]);
      setSelectedScenario(null);
      setCurrentStage(0);
      setScore(0);
      setSelectedOption(null);
      setShowFeedback(false);
      setSelectedAnswer(null);
      setActiveTab('results');
    }
  };

  const startScenario = (id) => {
    setSelectedScenario(id);
    setCurrentStage(0);
    setScore(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setSelectedAnswer(null);
    setActiveTab('simulation');
  };

  const tabs = [
    { id: 'scenarios', label: '🏥 Scenarios' },
    { id: 'simulation', label: '🩺 Simulation' },
    { id: 'results', label: '📊 Results' },
  ];

  return (
    <>
      <title>Patient Simulator — OpenPrep AI</title>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        <div>
          <span className="text-xs font-mono font-bold uppercase text-purple-400">.clinical simulation</span>
          <h1 className="text-2xl md:text-3xl font-black mt-1">🩺 Patient Simulator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Practice clinical decision-making with {SCENARIOS.length} interactive patient scenarios and real-time vital sign monitoring</p>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-purple-500">{SCENARIOS.length}</div>
            <div className="text-xs text-gray-500">Scenarios</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-emerald-500">{completedScenarios.length}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-blue-500">{SCENARIOS.reduce((s, sc) => s + sc.stages.length, 0)}</div>
            <div className="text-xs text-gray-500">Decision Points</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-amber-500">{completedScenarios.length > 0 ? Math.round(completedScenarios.reduce((s, c) => s + (c.score / c.total), 0) / completedScenarios.length * 100) : 0}%</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { if (t.id !== 'simulation' || selectedScenario) setActiveTab(t.id); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'} ${t.id === 'simulation' && !selectedScenario ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ SCENARIOS TAB ═══════════ */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {SCENARIOS.map(sc => {
              const completed = completedScenarios.find(c => c.id === sc.id);
              return (
                <div key={sc.id} className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{sc.icon}</span>
                        <span className="text-xs font-bold">{sc.specialty}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sc.difficulty === 'Expert' ? 'bg-red-500/20 text-red-400' : sc.difficulty === 'Advanced' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{sc.difficulty}</span>
                      </div>
                      <h3 className="text-sm font-bold">{sc.title}</h3>
                      <div className="text-[10px] text-gray-500 mt-1">{sc.stages.length} decision stages · {sc.patient.name}, {sc.patient.age}{sc.patient.sex[0]}</div>
                      {completed && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">✓ Completed</span>
                          <span className="text-[10px] text-gray-500">Score: {completed.score}/{completed.total}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => startScenario(sc.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition">
                      {completed ? 'Retry' : 'Start'} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════ SIMULATION TAB ═══════════ */}
        {activeTab === 'simulation' && scenario && stage && (
          <div className="space-y-4">
            {/* PATIENT INFO */}
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{scenario.icon}</span>
                <div>
                  <h3 className="text-sm font-bold">{scenario.title}</h3>
                  <div className="text-[10px] text-gray-500">{scenario.patient.name} · {scenario.patient.age} {scenario.patient.sex} · {scenario.patient.weight}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Allergies: {scenario.patient.allergies.join(', ')}</span>
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">Hx: {scenario.patient.history.join(', ')}</span>
              </div>
            </div>

            {/* VITAL SIGNS */}
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold">📊 Live Vitals — Stage {currentStage + 1}/{scenario.stages.length}</h4>
                <ProgressTracker current={currentStage} total={scenario.stages.length} />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <VitalGauge label="Heart Rate" value={stage.vitals.hr} unit="bpm" icon="❤️" color="#ef4444" status={getVitalStatus('hr', stage.vitals.hr)} />
                <VitalGauge label="Blood Pressure" value={stage.vitals.bp} unit="mmHg" icon="🩺" color="#3b82f6" status={getVitalStatus('bp', stage.vitals.bp)} />
                <VitalGauge label="Resp Rate" value={stage.vitals.rr} unit="/min" icon="🫁" color="#22c55e" status={getVitalStatus('rr', stage.vitals.rr)} />
                <VitalGauge label="Temperature" value={stage.vitals.temp} unit="°C" icon="🌡️" color="#f59e0b" status={getVitalStatus('temp', stage.vitals.temp)} />
                <VitalGauge label="SpO2" value={stage.vitals.spo2} unit="%" icon="💧" color="#06b6d4" status={getVitalStatus('spo2', stage.vitals.spo2)} />
                <VitalGauge label="Pain" value={stage.vitals.pain} unit="/10" icon="😣" color="#a855f7" status={getVitalStatus('pain', stage.vitals.pain)} />
              </div>
              <div className="mt-3 bg-gray-200 dark:bg-gray-800 rounded-xl p-2">
                <div className="text-[10px] text-gray-500 mb-1">💓 EKG Rhythm (HR: {stage.vitals.hr})</div>
                <EKGLine hr={stage.vitals.hr} />
              </div>
            </div>

            {/* CLINICAL SCENARIO */}
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">Stage {currentStage + 1}: {stage.title}</div>
              <p className="text-sm text-gray-300 mb-4">{stage.prompt}</p>
              <div className="space-y-2">
                {stage.options.map((opt, i) => {
                  const isSelected = selectedOption === opt.id;
                  const isCorrect = opt.correct;
                  let borderColor = 'border-gray-200 dark:border-gray-700';
                  if (showFeedback && isSelected) borderColor = isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10';
                  else if (showFeedback && isCorrect) borderColor = 'border-emerald-500/50';
                  return (
                    <button key={opt.id} onClick={() => !showFeedback && handleAnswer(opt)} disabled={showFeedback}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition ${borderColor} ${!showFeedback ? 'hover:border-purple-500 cursor-pointer' : 'cursor-default'}`}>
                      <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FEEDBACK */}
            {showFeedback && selectedAnswer && (
              <div className={`p-4 rounded-2xl border ${selectedAnswer.correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{selectedAnswer.correct ? '✅' : '❌'}</span>
                  <span className="text-sm font-bold">{selectedAnswer.correct ? 'Correct!' : 'Incorrect'}</span>
                </div>
                <p className="text-xs text-gray-300">{selectedAnswer.feedback}</p>
                <button onClick={handleNextStage}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition">
                  {currentStage < scenario.stages.length - 1 ? 'Next Stage →' : 'Complete Scenario ✓'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ RESULTS TAB ═══════════ */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {completedScenarios.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏥</div>
                <p className="text-sm font-bold">No scenarios completed yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a scenario to see your results here</p>
              </div>
            ) : (
              completedScenarios.map(c => {
                const sc = SCENARIOS.find(s => s.id === c.id);
                const pct = Math.round((c.score / c.total) * 100);
                return (
                  <div key={c.id} className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sc?.icon}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold">{sc?.title}</h4>
                        <div className="text-[10px] text-gray-500">{sc?.specialty} · {sc?.difficulty}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</div>
                        <div className="text-[10px] text-gray-500">{c.score}/{c.total} correct</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
