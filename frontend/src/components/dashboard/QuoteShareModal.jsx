import React, { useState } from 'react';
import { X, Copy, Check, Share2, Sparkles, Send, Twitter, Linkedin } from 'lucide-react';

export default function QuoteShareModal({ quote, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!quote) return null;

  const formattedShareText = `"${quote.quote}"\n— ${quote.author} (${quote.field})\n\nStudying on OpenPrep AI 🚀 #StudyMotivation #OpenPrep`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedShareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareToWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedShareText)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(formattedShareText)}`;
    window.open(url, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://openprep.ai')}&summary=${encodeURIComponent(formattedShareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-800/80 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Share Daily Study Inspiration
            </h3>
            <p className="text-xs text-neutral-400">
              Inspire peer study squad members & track your daily habit
            </p>
          </div>
        </div>

        {/* Preview Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-amber-950/20 border border-amber-500/30 shadow-inner space-y-4">
          <div className="flex items-center justify-between text-xs text-amber-400/80 font-mono tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> OpenPrep Daily Wisdom
            </span>
            <span>{quote.field}</span>
          </div>

          <p className="text-base font-serif italic text-white/95 leading-relaxed">
            "{quote.quote}"
          </p>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300">— {quote.author}</span>
            <span className="text-neutral-500 text-[11px]">{quote.context}</span>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-neutral-400 block">
            Direct Share Channels
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={shareToWhatsApp}
              className="py-2.5 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Send className="w-4 h-4" /> WhatsApp
            </button>
            <button
              onClick={shareToTwitter}
              className="py-2.5 px-3 bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/30 text-sky-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Twitter className="w-4 h-4" /> X (Twitter)
            </button>
            <button
              onClick={shareToLinkedIn}
              className="py-2.5 px-3 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Linkedin className="w-4 h-4" /> LinkedIn
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <button
            onClick={handleCopy}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" /> Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Formatted Text
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
