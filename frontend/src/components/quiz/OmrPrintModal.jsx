import React, { useState } from 'react';
import { X, Printer, Download, FileText, CheckCircle, Sparkles, Loader2 } from 'lucide-react';

export default function OmrPrintModal({ quizId, onClose }) {
  const [downloadingOmr, setDownloadingOmr] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState(false);

  const handlePrintOmr = async () => {
    setDownloadingOmr(true);
    try {
      window.open(`/api/quizzes/${quizId || 'QUIZ-001'}/omr-sheet.pdf?studentId=STD9921`, '_blank');
    } catch (error) {
      console.error('Error fetching printable PDF document stream:', error);
    } finally {
      setDownloadingOmr(false);
    }
  };

  const handlePrintAnswerKey = async () => {
    setDownloadingKey(true);
    try {
      window.open(`/api/quizzes/${quizId || 'QUIZ-001'}/answer-key.pdf`, '_blank');
    } catch (error) {
      console.error('Error fetching answer key PDF document stream:', error);
    } finally {
      setDownloadingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-white flex items-center gap-2 font-playfair">
            <Printer className="w-5 h-5 text-rose-500" /> Print Offline Exam Package
          </h3>
          <p className="text-xs text-stone-400 font-semibold">
            Simulate official test conditions (UPSC, NEET, SAT) by printing a physical A4 OMR bubble sheet. Scan the header QR code post-test to review answers online.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handlePrintOmr}
            disabled={downloadingOmr}
            className="w-full p-3.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-2xl flex items-center justify-between text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-200">Printable OMR Bubble Sheet</h4>
                <p className="text-[11px] text-stone-400">A4 layout with scanner corner anchors & QR code</p>
              </div>
            </div>
            {downloadingOmr ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Download className="w-4 h-4 text-stone-400 group-hover:text-white" />}
          </button>

          <button
            onClick={handlePrintAnswerKey}
            disabled={downloadingKey}
            className="w-full p-3.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-2xl flex items-center justify-between text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-200">Examiner Answer Key PDF</h4>
                <p className="text-[11px] text-stone-400">Correct answers & detailed solution explanations</p>
              </div>
            </div>
            {downloadingKey ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Download className="w-4 h-4 text-stone-400 group-hover:text-white" />}
          </button>
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-stone-300 bg-neutral-800 hover:bg-neutral-750 rounded-xl transition cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
