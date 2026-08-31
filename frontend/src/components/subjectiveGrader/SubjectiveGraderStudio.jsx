import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  BookOpen,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart2,
  RefreshCw,
  MessageSquareCode,
  Check,
} from 'lucide-react';
import subjectiveGraderService from '../../services/subjectiveGraderService';

export const SubjectiveGraderStudio = ({ initialQuestion = '', initialModelAnswer = '' }) => {
  const [questionText, setQuestionText] = useState(
    initialQuestion || 'Explain the difference between photosynthesis and cellular respiration, detailing energy inputs and outputs.'
  );
  const [modelAnswer, setModelAnswer] = useState(
    initialModelAnswer ||
      'Photosynthesis converts solar light energy into chemical energy (glucose) in chloroplasts using carbon dioxide and water, releasing oxygen as a byproduct. Cellular respiration breaks down glucose in mitochondria using oxygen to yield ATP energy, water, and carbon dioxide as byproducts. Thus, their chemical equations are inverse reactions.'
  );
  const [studentAnswer, setStudentAnswer] = useState(
    'Photosynthesis is when plants absorb sunlight and water to produce energy and sugar. Cellular respiration happens in mitochondria where oxygen breaks down food to create ATP. Both processes are important for living organisms.'
  );

  const [totalMarks, setTotalMarks] = useState(10);
  const [grading, setGrading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const handleGradeAnswer = async (e) => {
    e?.preventDefault();
    if (!studentAnswer.trim() || !modelAnswer.trim()) return;

    try {
      setGrading(true);
      const res = await subjectiveGraderService.evaluateAnswer({
        studentAnswer: studentAnswer.trim(),
        modelAnswer: modelAnswer.trim(),
        questionText: questionText.trim(),
        totalMarks: Number(totalMarks) || 10,
      });

      if (res?.success) {
        setEvaluation(res.data);
      }
    } catch (err) {
      console.error('Subjective evaluation failed:', err);
    } finally {
      setGrading(false);
    }
  };

  const getAnnotationBadge = (type) => {
    switch (type) {
      case 'correct_point':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          badge: 'bg-emerald-500 text-slate-950 font-bold',
          label: 'Correct Point',
        };
      case 'misconception':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          badge: 'bg-rose-500 text-slate-950 font-bold',
          label: 'Misconception',
        };
      case 'missing_element':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          label: 'Missing Element',
        };
      default:
        return {
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          badge: 'bg-indigo-500 text-slate-950 font-bold',
          label: 'Suggestion',
        };
    }
  };

  return (
    <div className="w-full min-h-[700px] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl p-6 flex flex-col space-y-6">
      {/* Studio Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Subjective Answer Grader Studio</h2>
            <p className="text-xs text-slate-400">Multi-Criteria Rubric Evaluation & Inline Step Annotator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModelAnswer(!showModelAnswer)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
          >
            {showModelAnswer ? 'Hide Model Answer' : 'Compare Model Answer'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* LEFT COLUMN: Input Configuration Form */}
        <form onSubmit={handleGradeAnswer} className="lg:col-span-5 flex flex-col space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800/80">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Question Prompt</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Official Model Answer / Key</label>
            <textarea
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={4}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Student Answer Response</label>
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              rows={5}
              placeholder="Paste student handwritten transcription or written response..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Total Marks:</span>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-16 p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-center text-white"
              />
            </div>

            <button
              type="submit"
              disabled={grading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${grading ? 'animate-spin' : ''}`} />
              <span>{grading ? 'Evaluating Rubric...' : 'Grade Subjective Answer'}</span>
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: Evaluation & Inline Annotation Dashboard */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Optional Model Answer Comparison Drawer */}
          {showModelAnswer && (
            <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2 animate-fadeIn">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Official Reference Key</span>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">{modelAnswer}</p>
            </div>
          )}

          {!evaluation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-xl border border-slate-800 text-center text-slate-500 space-y-3">
              <BarChart2 className="w-10 h-10 text-indigo-500/40" />
              <div>
                <p className="text-sm font-semibold text-slate-300">Ready for Subjective Grading</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Click "Grade Subjective Answer" to run multi-criteria rubric evaluation and generate interactive inline annotations.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4 overflow-y-auto max-h-[600px] pr-1">
              
              {/* Score Banner */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-inner">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Grade: {evaluation.grade || 'A'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Multi-Criteria Score</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {evaluation.totalScore} <span className="text-sm font-normal text-slate-400">/ {evaluation.maxScore} Marks</span>
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-400 font-mono">{evaluation.percentage}%</div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Rubric Weighted</span>
                </div>
              </div>

              {/* Criteria Breakdown Grid */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rubric Criteria Breakdown</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {(evaluation.criteria || []).map((crit, idx) => {
                    const pct = Math.round((crit.score / crit.maxScore) * 100);
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-200">{crit.name}</span>
                          <span className="font-mono font-bold text-indigo-400">{crit.score} / {crit.maxScore}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400">{crit.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Inline Annotations */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MessageSquareCode className="w-4 h-4 text-indigo-400" /> Interactive Inline Annotations (Click line for details)
                </h4>
                
                <div className="space-y-2">
                  {(evaluation.inlineAnnotations || []).map((ann, idx) => {
                    const styleConfig = getAnnotationBadge(ann.type);
                    const isSelected = selectedAnnotation?.line === ann.line;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedAnnotation(isSelected ? null : ann)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${styleConfig.bg} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">Line {ann.line}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${styleConfig.badge}`}>
                              {styleConfig.label}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-300">{ann.markDelta}</span>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-100 font-mono mb-1">"{ann.textSnippet}"</p>
                        <p className="text-xs text-slate-300 leading-normal">{ann.comment}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Pills */}
              {evaluation.overallSummary && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall AI Evaluator Summary</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{evaluation.overallSummary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectiveGraderStudio;
