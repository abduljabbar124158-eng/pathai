import React, { useState } from 'react';
import { Sliders, Split, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { SlideCase } from '../types/pathology';

interface SlideComparatorProps {
  currentCase: SlideCase;
}

export const SlideComparator: React.FC<SlideComparatorProps> = ({ currentCase }) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100

  return (
    <div className="relative flex-1 flex flex-col bg-slate-950 overflow-hidden border border-slate-800 rounded-xl">
      {/* Comparator Top Header */}
      <div className="h-11 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between z-20 text-xs">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            Dual-Stain Histologic Comparison
          </span>
          <span className="text-slate-400">
            (H&E Stain vs {currentCase.ihcType || 'IHC Biomarker'})
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Left: H&E Morphologic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Right: {currentCase.ihcType || 'IHC DAB'}
          </span>
        </div>
      </div>

      {/* Interactive Curtain Wipe Split Stage */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {/* SVG Container */}
        <div className="relative w-[800px] h-[800px] rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
          {/* Base H&E Slide (Left side) */}
          <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
            <rect width="1000" height="1000" fill="#0f172a" />
            <path
              d="M 120 280 C 120 180, 240 100, 480 120 C 740 140, 880 220, 890 420 C 900 620, 840 820, 620 880 C 380 940, 150 840, 110 650 Z"
              fill="#ffe4e6"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            {/* H&E Hematoxylin cell clusters (Blue/Purple) */}
            <path
              d="M 220 250 Q 320 180 520 220 T 780 340 Q 860 520 740 690 T 480 820 Q 260 760 180 580 Z"
              fill="#312e81"
              opacity="0.8"
            />
            <circle cx="380" cy="360" r="26" fill="#fdf2f8" stroke="#4338ca" strokeWidth="4" />
            <circle cx="590" cy="330" r="22" fill="#fdf2f8" stroke="#4338ca" strokeWidth="4" />
            <circle cx="670" cy="460" r="30" fill="#fdf2f8" stroke="#4338ca" strokeWidth="5" />
          </svg>

          {/* IHC Slide Overlay (Clipped by slider position) */}
          <div
            style={{ width: `${100 - sliderPos}%` }}
            className="absolute top-0 right-0 bottom-0 overflow-hidden border-l-2 border-cyan-400 shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-[800px] h-[800px]">
              <svg viewBox="0 0 1000 1000" className="w-full h-full">
                <rect width="1000" height="1000" fill="#0f172a" />
                <path
                  d="M 120 280 C 120 180, 240 100, 480 120 C 740 140, 880 220, 890 420 C 900 620, 840 820, 620 880 C 380 940, 150 840, 110 650 Z"
                  fill="#fef3c7"
                  stroke="#d97706"
                  strokeWidth="2"
                />
                {/* IHC DAB Golden-Brown Membranous & Nuclear Staining */}
                <path
                  d="M 220 250 Q 320 180 520 220 T 780 340 Q 860 520 740 690 T 480 820 Q 260 760 180 580 Z"
                  fill="#78350f"
                  opacity="0.9"
                />
                <circle cx="380" cy="360" r="26" fill="#fffbeb" stroke="#b45309" strokeWidth="5" />
                <circle cx="590" cy="330" r="22" fill="#fffbeb" stroke="#b45309" strokeWidth="5" />
                <circle cx="670" cy="460" r="30" fill="#fffbeb" stroke="#b45309" strokeWidth="6" />
              </svg>
            </div>
          </div>

          {/* Split Slider Control Handle */}
          <div
            style={{ left: `${sliderPos}%` }}
            className="absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center cursor-ew-resize z-30"
          >
            <div className="w-6 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white shadow-xl border border-white">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Slider Position Control */}
      <div className="h-10 border-t border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium">Slide Curtain Position:</span>
        <input
          type="range"
          min="10"
          max="90"
          value={sliderPos}
          onChange={(e) => setSliderPos(parseInt(e.target.value, 10))}
          className="w-72 h-1.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
        />
        <span className="mono text-cyan-300 font-bold">{sliderPos}% H&E / {100 - sliderPos}% IHC</span>
      </div>
    </div>
  );
};
