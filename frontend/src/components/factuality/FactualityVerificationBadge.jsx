import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { factualityService } from '../../services/factualityService';
import FactualityReportModal from './FactualityReportModal';

export const FactualityVerificationBadge = ({
  targetType = 'flashcard',
  targetId = null,
  front = '',
  back = '',
  explanation = '',
  sourceContext = '',
  citations = [],
  onCorrectionApplied = null,
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleVerify = async (e) => {
    e?.stopPropagation();
    if (loading) return;

    if (report) {
      setModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      let res;
      if (targetType === 'flashcard') {
        res = await factualityService.verifyFlashcard({
          flashcardId: targetId,
          front,
          back,
          sourceContext,
          citations,
        });
      } else {
        res = await factualityService.verifyExplanation({
          questionId: targetId,
          explanation: explanation || back,
          sourceContext,
          citations,
        });
      }

      if (res?.success) {
        setReport(res.data);
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Factuality verification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!report) {
      return {
        label: 'Check Factuality',
        icon: ShieldCheck,
        bgClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20',
        badgeColor: '#6366f1',
      };
    }

    const { status, overallTrustScore } = report;

    if (status === 'VERIFIED') {
      return {
        label: `${overallTrustScore}% Fact-Checked`,
        icon: CheckCircle,
        bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
        badgeColor: '#10b981',
      };
    }

    if (status === 'PARTIALLY_VERIFIED' || status === 'UNVERIFIED') {
      return {
        label: `${overallTrustScore}% Trust Score`,
        icon: HelpCircle,
        bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
        badgeColor: '#f59e0b',
      };
    }

    return {
      label: status === 'HALLUCINATED_CITATION' ? 'Fake Citation Flag' : 'Fact Inaccuracy',
      icon: AlertTriangle,
      bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25 animate-pulse',
      badgeColor: '#ef4444',
    };
  };

  const config = getStatusConfig();
  const Icon = loading ? RefreshCw : config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size] || 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <>
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        title="AI Factuality & Citation Verification"
        className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm ${config.bgClass} ${sizeClasses}`}
      >
        <Icon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>{loading ? 'Verifying...' : config.label}</span>
      </button>

      {modalOpen && report && (
        <FactualityReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={report}
          targetType={targetType}
          targetId={targetId}
          onCorrectionApplied={(newContent) => {
            setReport((prev) => ({
              ...prev,
              status: 'VERIFIED',
              overallTrustScore: 100,
              factualityScore: 100,
              analyzedContent: newContent,
            }));
            if (onCorrectionApplied) onCorrectionApplied(newContent);
          }}
        />
      )}
    </>
  );
};

export default FactualityVerificationBadge;
