import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Calendar as CalendarIcon, CheckCircle, Circle } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const StudyPlanModal = ({ isOpen, onClose, activePlan }) => {
  const contentRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!activePlan) return null;

  const handleExportPDF = () => {
    if (!contentRef.current) return;
    setIsExporting(true);

    const element = contentRef.current;
    
    const opt = {
      margin: 10,
      filename: 'My_Study_Plan.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        setIsExporting(false);
      })
      .catch(err => {
        console.error('PDF export failed:', err);
        setIsExporting(false);
      });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#F5E6CA] rounded-md shadow-2xl overflow-hidden flex flex-col border border-[#8B4513]/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#8B4513]/20 bg-[#ebd5b3]">
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-8 h-8 text-[#8B4513]" />
                <h2 className="text-3xl font-bold font-playfair text-[#3E2723]">Study Plan</h2>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center space-x-2 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white px-4 py-2 rounded-sm hover:from-yellow-600 hover:to-yellow-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-semibold">{isExporting ? 'Exporting...' : 'Export to PDF'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#8B4513]/10 rounded-full transition-colors text-[#8B4513] cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content (PDF Target) */}
            <div className="overflow-y-auto p-8 flex-1 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
              <div ref={contentRef} className="bg-white/80 p-8 rounded-sm shadow-sm border border-[#8B4513]/10 max-w-3xl mx-auto" id="study-plan-content">
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold font-playfair text-[#3E2723] mb-2 border-b-2 border-[#8B4513]/30 pb-4 inline-block">
                    My Study Journey
                  </h1>
                  <p className="text-[#8B4513]/80 italic mt-2 text-lg">
                    Generated for your success
                  </p>
                </div>

                <div className="space-y-8">
                  {activePlan.dailyGoals && activePlan.dailyGoals.length > 0 ? (
                    activePlan.dailyGoals.map((day, idx) => {
                      const dateStr = day.date ? new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : `Day ${idx + 1}`;
                      return (
                        <div key={idx} className="bg-white rounded border border-[#8B4513]/20 overflow-hidden shadow-sm break-inside-avoid">
                          <div className="bg-[#8B4513]/5 p-4 border-b border-[#8B4513]/20">
                            <h3 className="text-xl font-bold font-playfair text-[#8B4513]">{dateStr}</h3>
                          </div>
                          <div className="p-4 space-y-3">
                            {day.tasks && day.tasks.length > 0 ? (
                              day.tasks.map((task, tIdx) => (
                                <div key={tIdx} className="flex items-start space-x-3 p-2 hover:bg-[#8B4513]/5 rounded transition-colors">
                                  {task.completed ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-[#8B4513]/40 mt-0.5 shrink-0" />
                                  )}
                                  <div>
                                    <p className="font-semibold text-neutral-800">{task.title || task.topic?.name || 'Untitled Task'}</p>
                                    {task.description && (
                                      <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-neutral-500 italic">No tasks scheduled for this day.</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-neutral-500 italic py-12">
                      No study plan data available.
                    </div>
                  )}
                </div>
                
                {/* PDF Footer spacer */}
                <div className="mt-12 pt-4 border-t border-[#8B4513]/20 text-center text-sm text-[#8B4513]/60 italic font-playfair">
                  Stay consistent. The roots of education are bitter, but the fruit is sweet.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StudyPlanModal;
