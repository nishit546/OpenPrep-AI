import React from 'react';

const LeatherBoard = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-900 p-4 sm:p-8 md:p-12 flex justify-center overflow-x-hidden font-inter">
      {/* Main Leather Cover */}
      <div className="relative w-full max-w-7xl bg-leather shadow-leather rounded-lg border-stitched p-6 md:p-10">
        
        {/* Binder Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-black/20 rounded-l-lg border-r border-black/40 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.5)] z-0" />
        
        {/* Metal Corner Protectors */}
        <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-tl-lg shadow-sm border-b border-r border-yellow-900/50" />
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-yellow-600 to-yellow-800 rounded-tr-lg shadow-sm border-b border-l border-yellow-900/50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 bg-gradient-to-tr from-yellow-600 to-yellow-800 rounded-bl-lg shadow-sm border-t border-r border-yellow-900/50" />
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-yellow-600 to-yellow-800 rounded-br-lg shadow-sm border-t border-l border-yellow-900/50" />

        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LeatherBoard;
