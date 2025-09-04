'use client';

import { useState, useRef, useEffect, TouchEvent } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { formatMintDate, formatHash } from '@/lib/format';

interface BottomSheetProps {
  selectedItem: {
    id: string;
    title: string;
    description?: string;
    category?: string[];
    image_url?: string;
    mint_url?: string;
    collection_address?: string;
    network?: string;
    created_at?: string;
  } | null;
  onExpandImage?: () => void;
}

const COLLAPSED_HEIGHT = 80;
const HALF_HEIGHT_RATIO = 0.5;
const VELOCITY_THRESHOLD = 0.5;

export default function BottomSheet({ selectedItem, onExpandImage }: BottomSheetProps) {
  const [height, setHeight] = useState(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  useEffect(() => {
    // Reset height when item changes
    if (selectedItem) {
      setHeight(COLLAPSED_HEIGHT);
    }
  }, [selectedItem?.id]);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    startHeight.current = height;
    lastY.current = touch.clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = startY.current - touch.clientY;
    const newHeight = Math.max(
      COLLAPSED_HEIGHT,
      Math.min(window.innerHeight * 0.9, startHeight.current + deltaY)
    );
    
    // Calculate velocity
    const now = Date.now();
    const timeDelta = now - lastTime.current;
    if (timeDelta > 0) {
      velocity.current = (touch.clientY - lastY.current) / timeDelta;
    }
    
    lastY.current = touch.clientY;
    lastTime.current = now;
    
    setHeight(newHeight);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const windowHeight = window.innerHeight;
    const halfHeight = windowHeight * HALF_HEIGHT_RATIO;
    const fullHeight = windowHeight * 0.9;
    
    // Determine target height based on velocity and position
    let targetHeight = height;
    
    if (Math.abs(velocity.current) > VELOCITY_THRESHOLD) {
      // Fast swipe
      if (velocity.current > 0) {
        // Swiping down - collapse
        targetHeight = COLLAPSED_HEIGHT;
      } else {
        // Swiping up - expand
        targetHeight = fullHeight;
      }
    } else {
      // Slow drag - snap to nearest state
      const distances = [
        { height: COLLAPSED_HEIGHT, distance: Math.abs(height - COLLAPSED_HEIGHT) },
        { height: halfHeight, distance: Math.abs(height - halfHeight) },
        { height: fullHeight, distance: Math.abs(height - fullHeight) }
      ];
      
      distances.sort((a, b) => a.distance - b.distance);
      targetHeight = distances[0].height;
    }
    
    setHeight(targetHeight);
  };

  const handleTap = () => {
    if (height === COLLAPSED_HEIGHT) {
      setHeight(window.innerHeight * HALF_HEIGHT_RATIO);
    }
  };

  if (!selectedItem) return null;

  const date = formatMintDate(selectedItem.created_at);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50 md:hidden transition-none"
      style={{ 
        height: `${height}px`,
        transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Drag Handle */}
      <div 
        className="absolute top-0 left-0 right-0 h-6 flex justify-center items-center cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <div className="w-12 h-1 bg-white/30 rounded-full" />
      </div>

      {/* Content */}
      <div className="pt-8 px-4 pb-4 h-full overflow-y-auto">
        {/* Header - Always Visible */}
        <div className="mb-4">
          <h2 className="font-mono text-white uppercase text-sm tracking-[0.08em] mb-1">
            {selectedItem.title}
          </h2>
          <p className="font-mono text-white/60 text-xs uppercase tracking-[0.08em]">
            {date}
          </p>
        </div>

        {/* Expanded Content */}
        {height > COLLAPSED_HEIGHT * 1.5 && (
          <>
            {/* Category Tags */}
            {selectedItem.category && selectedItem.category.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedItem.category.slice(0, 3).map((cat) => (
                  <span 
                    key={cat}
                    className="px-3 py-1 bg-white/10 rounded-full font-mono text-xs uppercase text-white/80 tracking-[0.08em]"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {selectedItem.description && (
              <div className="mb-4">
                <p className="font-mono text-white/80 text-xs leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              {selectedItem.network && (
                <div className="font-mono text-white/60 text-xs uppercase">
                  {selectedItem.network}
                </div>
              )}
              
              {selectedItem.collection_address && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white/60 text-xs">
                    # {formatHash(selectedItem.collection_address)}
                  </span>
                  <ExternalLink size={12} className="text-white/40" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {selectedItem.mint_url && (
                <a
                  href={selectedItem.mint_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 bg-white text-black font-mono font-normal uppercase text-xs tracking-[0.08em] text-center"
                >
                  VIEW ORIGINAL
                </a>
              )}
              
              {onExpandImage && (
                <button
                  onClick={onExpandImage}
                  className="p-3 bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Expand image"
                >
                  <Maximize2 size={16} className="text-white" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}