'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from 'react-modal-sheet';

interface MenuItem {
  id?: number;
  title: string;
  description: string;
  categories?: string[];
}

interface UltraMinimalSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose?: () => void;
  onInteraction?: () => void;
}

export default function UltraMinimalSheet({ 
  item, 
  isOpen, 
  onClose,
  onInteraction 
}: UltraMinimalSheetProps) {
  const [snapPoint, setSnapPoint] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Balanced minimal snap points - accessible yet clean
  const getSnapPoints = () => {
    const height = window.innerHeight;
    const minHeight = 80; // Height to show handle + title with proper spacing
    const maxHeight = Math.min(contentHeight + 120, height * 0.7);
    return [minHeight, maxHeight];
  };

  const [snapPoints, setSnapPoints] = useState(getSnapPoints);

  // Update snap points when content changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [item]);

  useEffect(() => {
    setSnapPoints(getSnapPoints());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHeight]);

  // Always collapse on new item
  useEffect(() => {
    if (item) {
      setSnapPoint(0);
    }
  }, [item?.id]);

  // Notify parent of interaction
  useEffect(() => {
    if (snapPoint === 1) {
      onInteraction?.();
    }
  }, [snapPoint, onInteraction]);

  if (!item) return null;

  const isExpanded = snapPoint === 1;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      snapPoints={snapPoints}
      initialSnap={0}
      onSnap={setSnapPoint}
      className="ultra-minimal-sheet"
      aria-label="Item details"
      role="dialog"
    >
      <Sheet.Container 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Sheet.Header />
        <Sheet.Content disableDrag={false} style={{ paddingTop: 0 }}>
          <div className="text-white font-mono">
            {/* Tappable area for expansion */}
            <div 
              onClick={() => !isExpanded && setSnapPoint(1)}
              style={{ 
                cursor: !isExpanded ? 'pointer' : 'default',
                paddingTop: '8px',
                paddingBottom: '8px'
              }}
            >
              {/* Title - always visible in collapsed state */}
              <div className="px-4">
                <h3 className="text-xs uppercase tracking-wider text-white truncate">
                  {item.title}
                </h3>
              </div>
            </div>

            {/* Expanded content - clean and minimal */}
            {isExpanded && (
              <div ref={contentRef} className="px-4 pb-4 space-y-3">
                {item.categories && item.categories[0] && (
                  <span className="text-[10px] uppercase text-white/50">
                    {item.categories[0]}
                  </span>
                )}
                
                <p className="text-xs text-white/70 leading-relaxed">
                  {item.description.length > 150 
                    ? item.description.substring(0, 150) + '...'
                    : item.description
                  }
                </p>
              </div>
            )}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop />
    </Sheet>
  );
}