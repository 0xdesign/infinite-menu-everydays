'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from 'react-modal-sheet';

interface MenuItem {
  id?: number;
  title: string;
  description: string;
  categories?: string[];
}

interface MinimalBottomSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose?: () => void;
  isSphereInteracting?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function MinimalBottomSheet({ 
  item, 
  isOpen, 
  onClose,
  isSphereInteracting = false,
  onExpandedChange 
}: MinimalBottomSheetProps) {
  const [snapPoint, setSnapPoint] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(300);

  // Minimal snap points
  const getSnapPoints = () => {
    const height = window.innerHeight;
    const minHeight = 72; // Just title height
    const maxHeight = Math.min(contentHeight + 100, height * 0.7);
    return [minHeight, maxHeight];
  };

  const [snapPoints, setSnapPoints] = useState(getSnapPoints);

  // Update content height
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [item]);

  // Update snap points
  useEffect(() => {
    setSnapPoints(getSnapPoints());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHeight]);

  // Auto-collapse on new item
  useEffect(() => {
    if (item) {
      setSnapPoint(0);
    }
  }, [item?.id]);

  // Auto-collapse when sphere is interacting
  useEffect(() => {
    if (isSphereInteracting && snapPoint === 1) {
      setSnapPoint(0);
    }
  }, [isSphereInteracting, snapPoint]);

  // Report expansion state
  useEffect(() => {
    onExpandedChange?.(snapPoint === 1);
  }, [snapPoint, onExpandedChange]);

  if (!item) return null;

  const isExpanded = snapPoint === 1;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      snapPoints={snapPoints}
      initialSnap={0}
      onSnap={setSnapPoint}
    >
      <Sheet.Container 
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Sheet.Header />
        
        {/* CRITICAL: No disableDrag, no onClick handlers that conflict with gestures */}
        <Sheet.Content>
          <div className="text-white font-mono">
            {/* Title - always visible, click for desktop testing */}
            <div 
              className="px-4 pb-3 pt-1"
              onClick={() => {
                // Only for desktop testing - won't interfere on actual mobile
                if (!isExpanded && window.matchMedia('(pointer: coarse)').matches === false) {
                  setSnapPoint(1);
                }
              }}
              style={{ cursor: !isExpanded ? 'pointer' : 'default' }}
            >
              <h3 className="text-xs uppercase tracking-wider text-white truncate">
                {item.title}
              </h3>
            </div>

            {/* Expanded content */}
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
      
      {/* CRITICAL: Sheet.Backdrop must be present for proper touch handling */}
      <Sheet.Backdrop />
    </Sheet>
  );
}