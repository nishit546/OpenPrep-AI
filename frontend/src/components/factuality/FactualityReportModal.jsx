import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, FileText, CheckCircle2, AlertOctagon, BookOpen, Sparkles, Check } from 'lucide-react';
import { factualityService } from '../../services/factualityService';

export const FactualityReportModal = ({
  isOpen,
  onClose,
  report,
  targetType = 'flashcard',
  targetId = null,
  onCorrectionApplied,
}) => {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' | 'citations' | 'correction'

  if (!isOpen || !report) return null;

  const {
    factualityScore = 100,
    citationScore = 100,
    overallTrustScore = 100,
    status = 'VERIFIED',
    claims = [],
    citations = [],
    suggestedCorrections = null,
  } = report;

  const handleApplyCorrection = async () => {
    if (!suggestedCorrections || applying || applied) return;

    try {
      setApplying(true);
      const payload = {
        targetType,
        targetId,
        correctedBack: suggestedCorrections.correctedText,
        correctedExplanation: suggestedCorrections.correctedText,
      };

      const res = await factualityService.applyCorrection(payload);
      if (res?.success) {
        setApplied(true);
        if (onCorrectionApplied) {
          onCorrectionApplied(suggestedCorrections.correctedText);
        }
      }
    } catch (err) {
      console.error('Failed to apply correction:', err);
    } finally {
      setApplying(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Factually Verified
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Partially Verified
          </span>
        );
      case 'FACTUAL_INACCURACY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3.5 h-3.5" /> Factual Inaccuracy Flagged
          </span>
        );
      case 'HALLUCINATED_CITATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <BookOpen className="w-3.5 h-3.5" /> Fake/Hallucinated Citation Flagged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            Unverified Context
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Factuality & Citation Audit Report</h2>
              <p className="text-xs text-slate-400">AI Grounding & Hallucination Diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Overview Bar */}
        <div className="p-6 bg-slate-950/50 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>{getStatusBadge()}</div>
            <div className="text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Overall Trust Score</span>
              <div className="text-2xl font-black text-white">{overallTrustScore} <span className="text-sm font-normal text-slate-400">/ 100</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Factuality Gauge */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Factual Accuracy Score</span>
                <span className="font-mono font-bold text-indigo-400">{factualityScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${factualityScore}%` }}
                />
              </div>
            </div>

            {/* Citation Gauge */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Citation Authenticity Score</span>
                <span className="font-mono font-bold text-emerald-400">{citationScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${citationScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'claims'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Factual Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'citations'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Citations & DOIs ({citations.length})
          </button>
          {suggestedCorrections && (
            <button
              onClick={() => setActiveTab('correction')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'correction'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-amber-400/70 hover:text-amber-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Suggested Correction
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[45vh] flex-1 space-y-4">
          {activeTab === 'claims' && (
            <div className="space-y-3">
              {claims.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No specific factual statements extracted.</div>
              ) : (
                claims.map((claimItem, idx) => (
                  <div
                    key={claimItem.id || idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-200">{claimItem.claim}</p>
                      {claimItem.status === 'VERIFIED' && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          VERIFIED
                        </span>
                      )}
                      {claimItem.status === 'UNGROUNDED' && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          UNGROUNDED
                        </span>
                      )}
                      {claimItem.status === 'FACTUAL_INACCURACY' && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          INACCURATE
                        </span>
                      )}
                    </div>
                    {claimItem.evidence && (
                      <p className="text-xs text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                        <span className="font-semibold text-slate-300">Grounding Evidence: </span>
                        {claimItem.evidence}
                      </p>
                    )}
                    {claimItem.suggestedFix && (
                      <div className="text-xs text-amber-300/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        <span className="font-semibold text-amber-400">Suggested Fix: </span>
                        {claimItem.suggestedFix}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'citations' && (
            <div className="space-y-3">
              {citations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No citations referenced.</div>
              ) : (
                citations.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{c.citation}</span>
                      {c.isValid ? (
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400">
                          VALID SOURCE
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-rose-500/20 text-rose-400">
                          HALLUCINATED / INVALID
                        </span>
                      )}
                    </div>
                    {c.title && <p className="text-slate-300 font-medium">{c.title}</p>}
                    {c.authors && <p className="text-slate-400">Authors: {Array.isArray(c.authors) ? c.authors.join(', ') : c.authors}</p>}
                    {c.details && <p className="text-slate-400 italic">{c.details}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'correction' && suggestedCorrections && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                <p className="font-semibold text-amber-400 mb-1">AI Fact-Check Correction Reasoning:</p>
                <p>{suggestedCorrections.reasoning}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
                  <span className="font-bold text-rose-400 block mb-2">Original Content</span>
                  <p className="text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{suggestedCorrections.originalText}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="font-bold text-emerald-400 block mb-2">Corrected Grounded Content</span>
                  <p className="text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{suggestedCorrections.correctedText}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close Report
          </button>

          {suggestedCorrections && targetId && (
            <button
              onClick={handleApplyCorrection}
              disabled={applying || applied}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-lg ${
                applied
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}
            >
              {applied ? (
                <>
                  <Check className="w-4 h-4" /> Correction Applied!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {applying ? 'Applying Fix...' : 'Apply 1-Click Correction'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FactualityReportModal;
