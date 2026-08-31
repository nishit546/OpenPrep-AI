import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PublicVerifyCertificate() {
  const { certId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/certificates/verify/${certId}`)
      .then(res => res.json())
      .then(json => {
        if (json.verified) setData(json);
      })
      .catch(err => console.error('Error contacting central registry pipeline:', err))
      .finally(() => setLoading(false));
  }, [certId]);

  if (loading) return <div className="text-center p-12 text-slate-400">Consulting OpenPrep Cryptographic Registry...</div>;

  if (!data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-950/20 border border-rose-500/30 text-rose-400 rounded-2xl text-center">
        <span className="text-3xl">⚠️</span>
        <h2 className="text-lg font-bold mt-2">Invalid Credential Artifact</h2>
        <p className="text-xs text-rose-300 mt-1">This signature hash verification failed or does not correspond to a valid issue block record.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full p-2 text-xl">✓</div>
        <div>
          <h2 className="text-lg font-bold text-white">Credential Authenticity Confirmed</h2>
          <p className="text-xs text-slate-400">Verified via OpenPrep AI SHA-256 Cryptographic Audit Logs</p>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-4 space-y-4 font-sans text-sm">
        <div>
          <span className="block text-xs text-slate-500 uppercase tracking-wider">Recipient Name</span>
          <span className="text-base font-semibold text-slate-100">{data.recipientName}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-500 uppercase tracking-wider">Credential Program</span>
          <span className="text-base font-semibold text-slate-200">{data.credentialTitle}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-xs text-slate-500 uppercase tracking-wider">Issue Date</span>
            <span className="text-slate-300 font-mono">{data.issueDate}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 uppercase tracking-wider">Status</span>
            <span className="inline-block px-2 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20">VALID</span>
          </div>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-500 select-all break-all">
          PROOF_HASH: {data.signatureVerificationProof}
        </div>
      </div>
    </div>
  );
}
