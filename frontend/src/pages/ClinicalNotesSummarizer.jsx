import { useState, useMemo } from 'react';

/* ─────────────────────── MOCK DATA ─────────────────────── */
const TEMPLATES = [
  { id: 'soap', name: 'SOAP Note', icon: '📋', color: '#a855f7', desc: 'Subjective, Objective, Assessment, Plan', sections: ['Subjective', 'Objective', 'Assessment', 'Plan'] },
  { id: 'hpi', name: 'HPI Note', icon: '📝', color: '#3b82f6', desc: 'History of Present Illness', sections: ['Chief Complaint', 'Onset', 'Location', 'Duration', 'Character', 'Aggravating/Alleviating', 'Radiation', 'Timing', 'Severity', 'Associated Symptoms'] },
  { id: 'progress', name: 'Progress Note', icon: '📊', color: '#22c55e', desc: 'Daily progress documentation', sections: ['Subjective', 'Vitals', 'Physical Exam', 'Labs/Imaging', 'Assessment', 'Plan'] },
  { id: 'discharge', name: 'Discharge Summary', icon: '🏥', color: '#f59e0b', desc: 'Patient discharge documentation', sections: ['Admission Info', 'Hospital Course', 'Discharge Diagnosis', 'Discharge Meds', 'Follow-up', 'Patient Instructions'] },
  { id: 'consult', name: 'Consultation Note', icon: '👨‍⚕️', color: '#ef4444', desc: 'Specialist consultation', sections: ['Reason for Consult', 'History', 'Exam Findings', 'Impression', 'Recommendations'] },
  { id: 'procedure', name: 'Procedure Note', icon: '🔬', color: '#06b6d4', desc: 'Procedure documentation', sections: ['Procedure', 'Indication', 'Consent', 'Technique', 'Findings', 'Complications', 'Estimated Blood Loss'] },
];

const SAMPLE_NOTES = [
  {
    id: 1, template: 'soap', patient: 'John M., 58M', date: '2026-08-28', author: 'Dr. Priya Sharma',
    content: {
      Subjective: 'Patient presents with 2-hour history of substernal chest pain radiating to the left arm, rated 7/10. Associated with diaphoresis and nausea. No shortness of breath. Denies recent trauma. History of HTN, smoking 1 pack/day x 20 years.',
      Objective: 'BP: 152/94 mmHg, HR: 102 bpm, RR: 20, Temp: 36.8°C, SpO2: 96% RA. General: Diaphoretic, appears uncomfortable. Cardiovascular: Regular rate, no murmurs. Lungs: Clear bilaterally. ECG: ST elevation II, III, aVF with reciprocal changes I, aVL.',
      Assessment: '1. ST-Elevation Myocardial Infarction (STEMI) — Inferior wall\n2. Hypertension, uncontrolled\n3. Tobacco use disorder',
      Plan: '1. Activate cath lab for emergent PCI\n2. Aspirin 325mg PO stat\n3. Heparin 60 units/kg IV bolus\n4. Nitroglycerin SL PRN chest pain\n5. Cardiology consult\n6. Transfer to CCU post-PCI'
    },
    tags: ['Cardiology', 'Emergency', 'ACS'],
  },
  {
    id: 2, template: 'soap', patient: 'Sarah K., 34F', date: '2026-08-27', author: 'Dr. Arjun Mehta',
    content: {
      Subjective: 'Patient presents with 3-day history of productive cough with yellow-green sputum, low-grade fever (38.2°C), and right-sided chest pain worsening with deep inspiration. No hemoptysis. History of asthma.',
      Objective: 'BP: 118/72, HR: 88, RR: 22, Temp: 38.4°C, SpO2: 95% RA. Lungs: Decreased breath sounds and crackles at right lower lobe. WBC: 14.2k, CRP: 45 mg/L. CXR: Right lower lobe consolidation.',
      Assessment: '1. Community-Acquired Pneumonia (right lower lobe)\n2. Asthma, stable',
      Plan: '1. Amoxicillin-clavulanate 875mg PO BID x 7 days\n2. Azithromycin 500mg PO day 1, then 250mg x 4 days\n3. Albuterol nebulizer Q4H PRN\n4. Acetaminophen 1g PO Q6H PRN fever\n5. Follow-up in 48-72 hours\n6. Repeat CXR in 6 weeks'
    },
    tags: ['Pulmonology', 'Infectious Disease'],
  },
  {
    id: 3, template: 'hpi', patient: 'Michael R., 72M', date: '2026-08-26', author: 'Dr. Neha Gupta',
    content: {
      'Chief Complaint': 'Sudden onset right-sided weakness and difficulty speaking',
      Onset: 'Acute, 45 minutes prior to arrival',
      Location: 'Right upper and lower extremity, facial droop right side',
      Duration: 'Persistent since onset, no improvement',
      Character: 'Flaccid weakness, right arm 2/5, right leg 3/5 strength',
      'Aggravating/Alleviating': 'No aggravating factors identified. No alleviating measures attempted.',
      Radiation: 'N/A',
      Timing: 'Nocturnal onset, patient found by spouse at 6:00 AM',
      Severity: 'NIHSS Score: 16 (moderate-severe stroke)',
      'Associated Symptoms': 'Slurred speech (dysarthria), right facial droop, mild headache, no seizure activity, no loss of consciousness'
    },
    tags: ['Neurology', 'Stroke', 'Emergency'],
  },
];

const CLINICAL_ABBREVIATIONS = [
  { abbr: 'BID', full: 'Twice daily', category: 'Frequency' },
  { abbr: 'TID', full: 'Three times daily', category: 'Frequency' },
  { abbr: 'QID', full: 'Four times daily', category: 'Frequency' },
  { abbr: 'PRN', full: 'As needed', category: 'Frequency' },
  { abbr: 'STAT', full: 'Immediately', category: 'Urgency' },
  { abbr: 'NPO', full: 'Nothing by mouth', category: 'Diet' },
  { abbr: 'PO', full: 'By mouth', category: 'Route' },
  { abbr: 'IV', full: 'Intravenous', category: 'Route' },
  { abbr: 'IM', full: 'Intramuscular', category: 'Route' },
  { abbr: 'SL', full: 'Sublingual', category: 'Route' },
  { abbr: 'HTN', full: 'Hypertension', category: 'Condition' },
  { abbr: 'DM', full: 'Diabetes Mellitus', category: 'Condition' },
  { abbr: 'CHF', full: 'Congestive Heart Failure', category: 'Condition' },
  { abbr: 'COPD', full: 'Chronic Obstructive Pulmonary Disease', category: 'Condition' },
  { abbr: 'MI', full: 'Myocardial Infarction', category: 'Condition' },
  { abbr: 'DVT', full: 'Deep Vein Thrombosis', category: 'Condition' },
  { abbr: 'PE', full: 'Pulmonary Embolism', category: 'Condition' },
  { abbr: 'CKD', full: 'Chronic Kidney Disease', category: 'Condition' },
  { abbr: 'WNL', full: 'Within Normal Limits', category: 'Status' },
  { abbr: 'NAD', full: 'No Acute Distress', category: 'Status' },
  { abbr: 'A&Ox3', full: 'Alert & Oriented x3 (person, place, time)', category: 'Neuro' },
  { abbr: 'RRR', full: 'Regular Rate and Rhythm', category: 'Cardiac' },
  { abbr: 'CTA', full: 'Clear to Auscultation', category: 'Pulmonary' },
  { abbr: 'NSR', full: 'Normal Sinus Rhythm', category: 'Cardiac' },
  { abbr: 'LAD', full: 'Left Axis Deviation', category: 'ECG' },
];

const CLINICAL_CALCULATORS = [
  { id: 'gcs', name: 'Glasgow Coma Scale', icon: '🧠', inputs: ['Eye Opening (1-4)', 'Verbal Response (1-5)', 'Motor Response (1-6)'], range: '3-15', description: 'Assesses level of consciousness' },
  { id: 'apgar', name: 'APGAR Score', icon: '👶', inputs: ['Appearance (0-2)', 'Pulse (0-2)', 'Grimace (0-2)', 'Activity (0-2)', 'Respiration (0-2)'], range: '0-10', description: 'Newborn assessment at 1 and 5 minutes' },
  { id: 'qtc', name: 'QTc Calculator', icon: '💓', inputs: ['QT interval (ms)', 'Heart Rate (bpm)'], range: '<450ms normal', description: 'Corrected QT interval (Bazett formula)' },
  { id: 'bmi', name: 'BMI Calculator', icon: '⚖️', inputs: ['Weight (kg)', 'Height (cm)'], range: '18.5-24.9 normal', description: 'Body Mass Index calculation' },
  { id: 'crb65', name: 'CRB-65 Score', icon: '🫁', inputs: ['Confusion', 'Respiration ≥30', 'BP systolic <90 or diastolic ≤60', 'Age ≥65'], range: '0-4', description: 'Pneumonia severity assessment' },
  { id: 'wells', name: 'Wells Score (PE)', icon: '🦵', inputs: ['Clinical signs of DVT', 'PE #1 diagnosis', 'Heart rate >100', 'Immobilization/Surgery', 'Previous DVT/PE', 'Hemoptysis', 'Malignancy'], range: '0-12.5', description: 'Pulmonary embolism probability' },
];

/* ─────────────────────── SVG COMPONENTS ─────────────────────── */
function TemplateCard({ template, onClick, selected }) {
  return (
    <button onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all ${selected ? 'border-purple-500 bg-purple-500/10 shadow-lg' : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50 hover:border-gray-400'}`}>
      <div className="text-2xl mb-2">{template.icon}</div>
      <h4 className="text-sm font-bold">{template.name}</h4>
      <p className="text-[10px] text-gray-500 mt-1">{template.desc}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {template.sections.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[9px] text-gray-400">{s}</span>)}
        {template.sections.length > 3 && <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[9px] text-gray-400">+{template.sections.length - 3}</span>}
      </div>
    </button>
  );
}

function NoteViewer({ note }) {
  const template = TEMPLATES.find(t => t.id === note.template);
  return (
    <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{template?.icon}</span>
            <span className="text-xs font-bold text-purple-400">{template?.name}</span>
          </div>
          <div className="text-sm font-bold mt-1">{note.patient}</div>
          <div className="text-[10px] text-gray-500">{note.date} · {note.author}</div>
        </div>
        <div className="flex flex-wrap gap-1">
          {note.tags.map(t => <span key={t} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[10px]">{t}</span>)}
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(note.content).map(([section, text]) => (
          <div key={section} className="p-3 bg-gray-200 dark:bg-gray-800 rounded-xl">
            <div className="text-[10px] text-purple-400 uppercase font-bold mb-1">{section}</div>
            <p className="text-xs text-gray-300 whitespace-pre-line">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function ClinicalNotesSummarizer() {
  const [activeTab, setActiveTab] = useState('notes');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [noteContent, setNoteContent] = useState({});
  const [noteTitle, setNoteTitle] = useState('');
  const [patientName, setPatientName] = useState('');
  const [savedNotes, setSavedNotes] = useState(SAMPLE_NOTES);
  const [searchAbbrev, setSearchAbbrev] = useState('');
  const [calculatorInputs, setCalculatorInputs] = useState({});
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [abbrevFilter, setAbbrevFilter] = useState('All');

  const filteredAbbreviations = useMemo(() => {
    let result = CLINICAL_ABBREVIATIONS;
    if (abbrevFilter !== 'All') result = result.filter(a => a.category === abbrevFilter);
    if (searchAbbrev) result = result.filter(a => a.abbr.toLowerCase().includes(searchAbbrev.toLowerCase()) || a.full.toLowerCase().includes(searchAbbrev.toLowerCase()));
    return result;
  }, [searchAbbrev, abbrevFilter]);

  const abbrevCategories = ['All', ...new Set(CLINICAL_ABBREVIATIONS.map(a => a.category))];

  const handleSaveNote = () => {
    if (!selectedTemplate || !patientName) return;
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    const newNote = {
      id: Date.now(), template: selectedTemplate, patient: patientName,
      date: new Date().toISOString().split('T')[0], author: 'You',
      content: { ...noteContent }, tags: [template.name],
    };
    setSavedNotes([newNote, ...savedNotes]);
    setNoteContent({});
    setPatientName('');
    setNoteTitle('');
    setSelectedTemplate(null);
    alert('Note saved successfully! 📝');
  };

  const calculateResult = (calc) => {
    const inputs = Object.values(calculatorInputs).map(Number);
    if (inputs.some(isNaN) || inputs.length === 0) return null;
    switch (calc.id) {
      case 'gcs': return inputs[0] + inputs[1] + inputs[2];
      case 'apgar': return inputs.reduce((s, v) => s + v, 0);
      case 'qtc': { const qt = inputs[0]; const hr = inputs[1]; return hr > 0 ? Math.round(qt / Math.sqrt(60000 / hr)) : null; }
      case 'bmi': { const [w, h] = inputs; return h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : null; }
      case 'crb65': return inputs.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
      case 'wells': return inputs.reduce((s, v) => s + v, 0);
      default: return null;
    }
  };

  const tabs = [
    { id: 'notes', label: '📝 Clinical Notes' },
    { id: 'templates', label: '📋 Templates' },
    { id: 'abbreviations', label: '🔤 Abbreviations' },
    { id: 'calculators', label: '🧮 Calculators' },
  ];

  return (
    <>
      <title>Clinical Notes Summarizer — OpenPrep AI</title>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        <div>
          <span className="text-xs font-mono font-bold uppercase text-purple-400">.clinical documentation</span>
          <h1 className="text-2xl md:text-3xl font-black mt-1">📝 Clinical Notes Summarizer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate SOAP notes, HPI documentation, and clinical summaries with {TEMPLATES.length} templates and {CLINICAL_ABBREVIATIONS.length}+ abbreviations</p>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-purple-500">{TEMPLATES.length}</div>
            <div className="text-xs text-gray-500">Templates</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-blue-500">{savedNotes.length}</div>
            <div className="text-xs text-gray-500">Saved Notes</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-emerald-500">{CLINICAL_ABBREVIATIONS.length}</div>
            <div className="text-xs text-gray-500">Abbreviations</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-2xl font-black text-amber-500">{CLINICAL_CALCULATORS.length}</div>
            <div className="text-xs text-gray-500">Calculators</div>
          </div>
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

        {/* ═══════════ NOTES TAB ═══════════ */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {expandedNote !== null ? (
              <div>
                <button onClick={() => setExpandedNote(null)} className="text-sm text-purple-400 hover:text-purple-300 mb-3">← Back to notes</button>
                <NoteViewer note={savedNotes.find(n => n.id === expandedNote)} />
              </div>
            ) : (
              <>
                <h3 className="text-sm font-bold">📂 Recent Clinical Notes</h3>
                <div className="space-y-3">
                  {savedNotes.map(note => {
                    const template = TEMPLATES.find(t => t.id === note.template);
                    return (
                      <div key={note.id} className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-purple-500/50 transition" onClick={() => setExpandedNote(note.id)}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{template?.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-purple-400">{template?.name}</span>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="text-xs font-bold">{note.patient}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{note.date} · {note.author}</div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[9px]">{t}</span>)}
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 line-clamp-2">
                          {Object.entries(note.content).map(([k, v]) => `${k}: ${typeof v === 'string' ? v.substring(0, 80) : ''}...`).join(' | ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════ TEMPLATES TAB ═══════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold">📋 Choose a Template</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map(t => (
                <TemplateCard key={t.id} template={t} selected={selectedTemplate === t.id} onClick={() => { setSelectedTemplate(t.id); setNoteContent({}); }} />
              ))}
            </div>

            {selectedTemplate && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{TEMPLATES.find(t => t.id === selectedTemplate)?.icon}</span>
                  <h3 className="text-sm font-bold">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Patient Name</label>
                    <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                      placeholder="e.g., John M., 58M"
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm" />
                  </div>
                  {TEMPLATES.find(t => t.id === selectedTemplate)?.sections.map(section => (
                    <div key={section}>
                      <label className="text-xs text-gray-500 mb-1 block">{section}</label>
                      <textarea
                        value={noteContent[section] || ''}
                        onChange={e => setNoteContent({ ...noteContent, [section]: e.target.value })}
                        placeholder={`Enter ${section.toLowerCase()}...`}
                        className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm h-20 resize-none" />
                    </div>
                  ))}
                  <button onClick={handleSaveNote}
                    className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition">
                    Save Note 📝
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ ABBREVIATIONS TAB ═══════════ */}
        {activeTab === 'abbreviations' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input type="text" placeholder="Search abbreviations..." value={searchAbbrev} onChange={e => setSearchAbbrev(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm flex-1" />
              <select value={abbrevFilter} onChange={e => setAbbrevFilter(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm">
                {abbrevCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredAbbreviations.map(a => (
                <div key={a.abbr} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                  <span className="text-sm font-mono font-bold text-purple-400 w-16">{a.abbr}</span>
                  <span className="text-xs text-gray-300 flex-1">{a.full}</span>
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[9px] text-gray-500">{a.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ CALCULATORS TAB ═══════════ */}
        {activeTab === 'calculators' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CLINICAL_CALCULATORS.map(calc => (
                <button key={calc.id} onClick={() => { setSelectedCalc(calc.id); setCalculatorInputs({}); }}
                  className={`p-4 rounded-2xl border text-left transition ${selectedCalc === calc.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50 hover:border-gray-400'}`}>
                  <div className="text-2xl mb-1">{calc.icon}</div>
                  <h4 className="text-xs font-bold">{calc.name}</h4>
                  <p className="text-[10px] text-gray-500 mt-1">{calc.description}</p>
                  <div className="text-[10px] text-purple-400 mt-1">Range: {calc.range}</div>
                </button>
              ))}
            </div>

            {selectedCalc && (
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{CLINICAL_CALCULATORS.find(c => c.id === selectedCalc)?.icon}</span>
                  <h3 className="text-sm font-bold">{CLINICAL_CALCULATORS.find(c => c.id === selectedCalc)?.name}</h3>
                </div>
                <div className="space-y-3">
                  {CLINICAL_CALCULATORS.find(c => c.id === selectedCalc)?.inputs.map((input, i) => (
                    <div key={i}>
                      <label className="text-xs text-gray-500 mb-1 block">{input}</label>
                      <input type="number" value={calculatorInputs[i] || ''} onChange={e => setCalculatorInputs({ ...calculatorInputs, [i]: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm" />
                    </div>
                  ))}
                  <button onClick={() => {}} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold">Calculate</button>
                  {calculateResult(CLINICAL_CALCULATORS.find(c => c.id === selectedCalc)) !== null && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
                      <div className="text-xs text-gray-500">Result</div>
                      <div className="text-3xl font-black text-purple-400 mt-1">{calculateResult(CLINICAL_CALCULATORS.find(c => c.id === selectedCalc))}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Range: {CLINICAL_CALCULATORS.find(c => c.id === selectedCalc)?.range}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
