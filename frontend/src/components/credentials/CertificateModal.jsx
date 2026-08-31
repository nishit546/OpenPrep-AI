import React, { useState } from 'react';

export default function CertificateModal({ isOpen, onClose, certificate }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !certificate) return null;

  const { id: certId, recipientName, credentialTitle, issueDate, signature } = certificate;
  const verifyUrl = `${window.location.origin}/verify/certificate/${certId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    window.open(`/api/certificates/${certId}/pdf`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(`I earned the ${credentialTitle} credential on OpenPrep AI! Verify authenticity: ${verifyUrl}`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-amber-500/30 p-8 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold p-2"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Certificate Frame Display */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-amber-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8 text-center shadow-inner">
          <div className="absolute top-3 left-3 text-2xl opacity-60">🏅</div>
          <div className="absolute top-3 right-3 text-2xl opacity-60">🏅</div>

          <h3 className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-2">
            OpenPrep AI Credential Network
          </h3>
          <h2 className="text-2xl font-extrabold text-white mb-4">
            Certificate of Achievement
          </h2>

          <p className="text-xs text-slate-400 mb-2">This honors milestone verification is proudly awarded to:</p>
          <p className="text-2xl font-bold text-amber-200 mb-4 tracking-wide font-serif">{recipientName}</p>

          <p className="text-xs text-slate-400 mb-1">for successfully mastering the curriculum criteria for:</p>
          <p className="text-lg font-semibold text-slate-100 mb-6">{credentialTitle}</p>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500">Issue Date</span>
              <span className="font-mono text-slate-300">{issueDate}</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 text-amber-300 font-semibold text-[11px]">
              SHA-256 Verified
            </div>
            <div>
              <span className="block text-[10px] text-slate-500">Credential ID</span>
              <span className="font-mono text-slate-400">{certId.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {copied ? '✓ Link Copied!' : 'Copy Verification Link'}
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition"
          >
            Share on LinkedIn
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg transition"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
