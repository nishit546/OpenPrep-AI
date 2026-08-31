import React, { useEffect, useState } from 'react';
import { Box, Sparkles, Award, Cpu, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ChestUnboxingModal({ reward, onClose }) {
  const [phase, setPhase] = useState('shaking'); // shaking, opened

  useEffect(() => {
    // 1. Trigger Shaking sound or animation duration
    const timer = setTimeout(() => {
      setPhase('opened');
      // 2. Trigger confetti burst upon opening!
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#fb7185', '#60a5fa', '#a78bfa'],
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      
      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes chest-shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-6deg) scale(1.05); }
          20%, 40%, 60%, 80% { transform: rotate(6deg) scale(1.05); }
        }
        @keyframes glow-sparkle {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.4)); }
          50% { filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.8)); }
        }
        @keyframes float-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-chest-shake {
          animation: chest-shake 0.6s ease-in-out infinite;
        }
        .animate-glow-sparkle {
          animation: glow-sparkle 1.5s infinite alternate;
        }
        .animate-float-up {
          animation: float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md text-center space-y-6 shadow-2xl overflow-hidden min-h-[380px] flex flex-col justify-center items-center">
        
        {/* Close Button */}
        {phase === 'opened' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-350 bg-slate-950/45 hover:bg-slate-950/90 border border-slate-850 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {phase === 'shaking' ? (
          /* SHAKING PHASE */
          <div className="space-y-6 flex flex-col items-center">
            <div className="relative animate-chest-shake">
              <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center text-amber-400 relative">
                <Box className="w-12 h-12" />
                <Sparkles className="w-6 h-6 absolute top-1 right-1 text-yellow-300 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-black text-amber-400 uppercase tracking-widest animate-pulse">
                Unboxing Rewards...
              </h3>
              <p className="text-xs text-slate-450">Brace yourself for mystery study loot!</p>
            </div>
          </div>
        ) : (
          /* OPENED PHASE */
          <div className="space-y-6 flex flex-col items-center animate-float-up">
            
            {/* Glow and Sparkle Background */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
              
              <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-slate-950 flex items-center justify-center text-yellow-400 relative shadow-2xl animate-glow-sparkle">
                {reward.rewardType === 'cosmetic' ? (
                  /* Cosmetic Avatar frame preview */
                  <div className="w-full h-full rounded-full border-4 border-yellow-500 flex items-center justify-center font-extrabold text-xs text-slate-300">
                    Cosmetic
                  </div>
                ) : (
                  /* XP amount reward text */
                  <span className="text-2xl font-black font-mono">+{reward.amount}</span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-white">Congratulations!</h3>
              <p className="text-xs text-slate-350 leading-relaxed max-w-xs mx-auto">
                {reward.rewardType === 'cosmetic' ? (
                  <span>
                    You unlocked the rare <strong className="text-yellow-400">{reward.cosmeticId?.replace(/_/g, ' ')}</strong> avatar frame! You can equip it from the shop.
                  </span>
                ) : (
                  <span>
                    You unlocked a mystery stash of <strong className="text-yellow-400">{reward.amount} XP</strong>! This progress has been added to your profile.
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
            >
              Collect Rewards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
