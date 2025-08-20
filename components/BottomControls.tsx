'use client';

import { Maximize2 } from 'lucide-react';

interface BottomControlsProps {
  itemCount: number;
  onExpandClick: () => void;
}

export default function BottomControls({ itemCount, onExpandClick }: BottomControlsProps) {
  return (
    <div className="fixed bottom-0 left-40 right-80 h-16 bg-black/80 backdrop-blur-sm border-t border-white/10 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Results Count */}
        <div className="font-mono text-white/60 text-xs uppercase tracking-[0.08em]">
          {itemCount} results
        </div>

        {/* Expand Button */}
        <button
          onClick={onExpandClick}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
          aria-label="Expand image"
        >
          <span className="font-mono text-white/80 group-hover:text-white text-xs uppercase tracking-[0.08em]">
            EXPAND
          </span>
          <Maximize2 size={14} className="text-white/60 group-hover:text-white" />
        </button>

        {/* Empty right side for balance */}
        <div className="w-20" />
      </div>
    </div>
  );
}