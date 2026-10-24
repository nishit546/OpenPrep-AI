import React, { useState } from 'react';
import { X, Scale, Check, AlertCircle, Copy, ArrowRight, Sparkles } from 'lucide-react';
import { balanceChemicalEquation } from '../../utils/chemicalEquationBalancer';

export default function EquationBalancerModal({ onClose }) {
  const [inputEquation, setInputEquation] = useState('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2');
  const [result, setResult] = useState(() => {
    try {
      return balanceChemicalEquation('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const PRESETS = [
    { label: 'Redox (KMnO4)', eq: 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2' },
    { label: 'Combustion', eq: 'C3H8 + O2 -> CO2 + H2O' },
    { label: 'Neutralization', eq: 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O' },
    { label: 'Photosynthesis', eq: 'CO2 + H2O -> C6H12O6 + O2' },
    { label: 'Displacement', eq: 'Zn + HCl -> ZnCl2 + H2' },
  ];

  const handleBalance = (eqToSolve) => {
    const target = eqToSolve !== undefined ? eqToSolve : inputEquation;
    try {
      setError(null);
      const balanced = balanceChemicalEquation(target);
      setResult(balanced);
    } catch (err) {
      setError(err.message || 'Failed to balance chemical equation.');
      setResult(null);
    }
  };

  const handleSelectPreset = (presetEq) => {
    setInputEquation(presetEq);
    handleBalance(presetEq);
  };

  const handleCopy = async () => {
    if (!result?.balancedString) return;
    try {
      await navigator.clipboard.writeText(result.balancedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy equation: ', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-800/80 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Chemical Reaction Balancer
            </h3>
            <p className="text-xs text-neutral-400">
              Gaussian elimination solver for stoichiometric coefficients & redox reactions
            </p>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-neutral-400 block uppercase tracking-wider">
            Quick Exam Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSelectPreset(p.eq)}
                className="px-2.5 py-1 rounded-lg text-xs bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer border border-neutral-700/60"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equation Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-300 block">
            Enter Unbalanced Chemical Equation (use <code className="text-cyan-400">-></code> or <code className="text-cyan-400">=</code>):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputEquation}
              onChange={(e) => setInputEquation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBalance()}
              placeholder="e.g. KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2"
              className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleBalance()}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-cyan-600/20"
            >
              Balance
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Balanced Result Display */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-950 via-cyan-950/20 to-neutral-950 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider font-semibold block mb-1">
                  Balanced Stoichiometric Equation
                </span>
                <div className="text-sm md:text-base font-mono font-bold text-white tracking-wide">
                  {result.balancedString}
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
                title="Copy balanced equation"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Verification Element Balance Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Step-by-Step Atom Count Verification
              </span>
              <div className="border border-neutral-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-800">
                    <tr>
                      <th className="p-2.5">Element</th>
                      <th className="p-2.5">Reactant Atoms</th>
                      <th className="p-2.5">Product Atoms</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 font-mono">
                    {result.verificationTable.map((row) => (
                      <tr key={row.element} className="hover:bg-neutral-850/50">
                        <td className="p-2.5 font-bold text-cyan-300">{row.element}</td>
                        <td className="p-2.5 text-neutral-200">{row.reactantCount}</td>
                        <td className="p-2.5 text-neutral-200">{row.productCount}</td>
                        <td className="p-2.5 text-center">
                          {row.balanced ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-sans font-bold">
                              <Check className="w-3 h-3" /> Balanced
                            </span>
                          ) : (
                            <span className="text-red-400 text-[11px] font-sans font-bold">Unbalanced</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
