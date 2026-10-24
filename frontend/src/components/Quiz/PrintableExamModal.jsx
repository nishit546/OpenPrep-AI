import React, { useState } from 'react';
import { X, Printer, FileText, CheckSquare, Settings2, Eye, Layout, CheckCircle } from 'lucide-react';
import '../../styles/print-exam.css';

export default function PrintableExamModal({
  quizTitle = 'Comprehensive Mock Examination',
  subject = 'General Preparation',
  questions = [],
  timeAllowed = '60 Minutes',
  totalMarks,
  institutionName = 'OpenPrep AI Examination System',
  onClose
}) {
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeOmr, setIncludeOmr] = useState(true);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [twoColumnLayout, setTwoColumnLayout] = useState(true);
  const [customInstitute, setCustomInstitute] = useState(institutionName);
  const [customTitle, setCustomTitle] = useState(quizTitle);

  const calculatedMarks = totalMarks || `${questions.length * 2} Marks`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Offline Question Paper Generator
              </h2>
              <p className="text-xs text-neutral-400">
                Configure print layout, multi-column paper format & attached OMR sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-800/80 hover:bg-neutral-700 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Settings & Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/80 p-5 rounded-2xl border border-neutral-800">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-neutral-300 block">
                Institute / Exam Title
              </label>
              <input
                type="text"
                value={customInstitute}
                onChange={(e) => setCustomInstitute(e.target.value)}
                placeholder="Institution Name"
                className="w-full text-xs px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Exam Title"
                className="w-full text-xs px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Layout Toggles */}
            <div className="space-y-2.5 text-xs">
              <span className="font-semibold text-neutral-300 block mb-1">Print Options</span>
              
              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="rounded border-neutral-700 text-indigo-600 focus:ring-0"
                />
                <span>Include Student & Institute details header</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={twoColumnLayout}
                  onChange={(e) => setTwoColumnLayout(e.target.checked)}
                  className="rounded border-neutral-700 text-indigo-600 focus:ring-0"
                />
                <span>Two-Column examination layout (saves paper)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeOmr}
                  onChange={(e) => setIncludeOmr(e.target.checked)}
                  className="rounded border-neutral-700 text-indigo-600 focus:ring-0"
                />
                <span>Attach physical OMR bubble sheet at end</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includeAnswerKey}
                  onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                  className="rounded border-neutral-700 text-indigo-600 focus:ring-0"
                />
                <span>Append separate Answer Key & Explanations</span>
              </label>
            </div>
          </div>

          {/* Paper Preview Card */}
          <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950">
            <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> Print Preview (A4 Paper Representation)
              </span>
              <span>{questions.length} Questions</span>
            </div>

            <div className="p-8 max-h-[420px] overflow-y-auto printable-preview-canvas text-black text-sm">
              {/* Header preview */}
              {includeHeader && (
                <div className="border-b-2 border-black pb-3 mb-4 text-center">
                  <h1 className="text-base font-bold uppercase tracking-wider">{customInstitute}</h1>
                  <h2 className="text-sm font-semibold text-gray-800 mt-1">{customTitle}</h2>
                  <div className="grid grid-cols-3 text-xs border-y border-dashed border-gray-500 py-1.5 my-2 font-medium">
                    <div>Subject: {subject}</div>
                    <div>Duration: {timeAllowed}</div>
                    <div>Max Marks: {calculatedMarks}</div>
                  </div>
                  <div className="grid grid-cols-2 text-xs border border-gray-600 p-2 text-left my-2">
                    <div>Candidate Name: ___________________________</div>
                    <div>Roll / Reg No: __________________</div>
                  </div>
                </div>
              )}

              {/* Questions preview */}
              <div className={twoColumnLayout ? 'columns-2 gap-6' : 'space-y-4'}>
                {questions.map((q, idx) => (
                  <div key={idx} className="break-inside-avoid pb-3 mb-3 border-b border-gray-200">
                    <p className="font-bold text-xs mb-1">
                      Q{idx + 1}. {q.question || q.questionText || `Sample question ${idx + 1}`}
                    </p>
                    <div className="pl-3 space-y-1 text-xs text-gray-800">
                      {(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-start gap-1.5">
                          <span className="font-semibold">({String.fromCharCode(65 + optIdx)})</span>
                          <span>{typeof opt === 'string' ? opt : opt.text || opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Attached OMR preview */}
              {includeOmr && (
                <div className="mt-8 pt-4 border-t-2 border-black">
                  <div className="text-center font-bold text-xs uppercase mb-3">
                    Attached OMR Answer Sheet - Darken the corresponding bubble
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs border border-gray-400 p-3">
                    {questions.slice(0, 20).map((_, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-gray-200 py-0.5">
                        <span className="font-bold">{i + 1}.</span>
                        <div className="flex gap-1">
                          {['A', 'B', 'C', 'D'].map((bubble) => (
                            <span
                              key={bubble}
                              className="w-4 h-4 rounded-full border border-black inline-flex items-center justify-center text-[9px] font-bold"
                            >
                              {bubble}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer Key preview */}
              {includeAnswerKey && (
                <div className="mt-8 pt-4 border-t-2 border-black">
                  <h3 className="text-center font-bold text-xs uppercase mb-2">Examiner Answer Key</h3>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {questions.map((q, i) => (
                      <div key={i} className="border border-gray-300 p-1 text-center">
                        <span className="font-semibold">Q{i + 1}: </span>
                        <span>{q.correctAnswer || 'A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <span className="text-xs text-neutral-400">
            Tip: Select "Save as PDF" in your system print dialog to export offline papers.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Paper / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Actual Hidden-From-Screen Print Container for window.print() */}
      <div className="print-container hidden print:block">
        {includeHeader && (
          <div className="exam-header">
            <h1>{customInstitute}</h1>
            <h2>{customTitle}</h2>
            <div className="exam-meta-grid">
              <div>Subject: {subject}</div>
              <div>Duration: {timeAllowed}</div>
              <div>Maximum Marks: {calculatedMarks}</div>
            </div>
            <div className="exam-student-box">
              <div>Candidate Full Name: <span className="fill-line"></span></div>
              <div>Roll / Seat Number: <span className="fill-line"></span></div>
            </div>
            <div className="exam-instructions">
              <strong>Instructions for Candidates:</strong>
              <ol>
                <li>Verify that the question paper contains {questions.length} questions before starting.</li>
                <li>Each question carries equal marks. Choose the single best option.</li>
                <li>Mark your chosen options in the attached OMR sheet using black/blue ballpoint pen.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Questions list */}
        <div className={`exam-questions-container ${twoColumnLayout ? '' : 'single-column'}`}>
          {questions.map((q, idx) => (
            <div key={idx} className="exam-question-card">
              <div className="exam-question-text">
                Q{idx + 1}. {q.question || q.questionText || `Question ${idx + 1}`}
              </div>
              <ul className="exam-options-list">
                {(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => (
                  <li key={optIdx} className="exam-option-item">
                    <span className="exam-option-marker">({String.fromCharCode(65 + optIdx)})</span>
                    <span>{typeof opt === 'string' ? opt : opt.text || opt.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Optional Attached OMR Sheet */}
        {includeOmr && (
          <div className="exam-omr-sheet">
            <div className="omr-header">
              <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>OFFICIAL OMR ANSWER SHEET</h2>
              <p style={{ fontSize: '9pt', margin: 0 }}>USE BLACK / BLUE BALLPOINT PEN ONLY. COMPLETELY DARKEN THE CORRESPONDING CIRCLE.</p>
            </div>
            <div className="omr-grid">
              {questions.map((_, i) => (
                <div key={i} className="omr-row">
                  <span style={{ fontWeight: 'bold' }}>{i + 1}.</span>
                  <div className="omr-bubbles">
                    {['A', 'B', 'C', 'D'].map((b) => (
                      <span key={b} className="omr-bubble">{b}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Separated Answer Key */}
        {includeAnswerKey && (
          <div className="exam-answer-key">
            <h2>Examiner Answer Key & Solution Reference</h2>
            <table className="answer-key-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Q#</th>
                  <th style={{ width: '25%' }}>Correct Option</th>
                  <th>Explanations & Reference</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => (
                  <tr key={i}>
                    <td>Q{i + 1}</td>
                    <td><strong>{q.correctAnswer || 'A'}</strong></td>
                    <td>{q.explanations?.correct || q.explanation || 'Refer to course curriculum notes.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
