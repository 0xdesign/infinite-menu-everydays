'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from 'react-modal-sheet';
import { CalendarBlank, Hash, Globe, Export, Heart, ShareNetwork, Copy } from 'phosphor-react';

interface MenuItem {
  id?: number;
  image: string;
  link: string;
  title: string;
  description: string;
  mintUrl?: string | null;
  createdAt?: string | null;
  categories?: string[]
;
  network?: string | null;
  collectionAddress?: string | null;
}

interface BottomSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose?: () => void;
  isSphereInteracting?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function BottomSheet({ item, isOpen, onClose, isSphereInteracting = false, onExpandedChange }: BottomSheetProps) {
  const [snapPoint, setSnapPoint] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Calculate snap points - only 2 states now
  const getSnapPoints = () => {
    const height = window.innerHeight;
    const minHeight = 72; // Ultra-minimal collapsed state
    // Dynamic height based on content, max 75% of screen for more content space
    const maxHeight = Math.min(contentHeight + 120, height * 0.75);
    
    return [minHeight, maxHeight];
  };

  const [snapPoints, setSnapPoints] = useState(getSnapPoints);

  // Update snap points when content changes
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [item, showFullDescription]);

  useEffect(() => {
    setSnapPoints(getSnapPoints());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHeight]);

  useEffect(() => {
    const handleResize = () => {
      setSnapPoints(getSnapPoints());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHeight]);

  // Reset to collapsed when item changes - immediate and reliable
  useEffect(() => {
    if (item) {
      // Force immediate collapse on new item
      setSnapPoint(0);
      setShowFullDescription(false);
    }
  }, [item?.id, item?.title, item]); // Multiple dependencies to ensure it triggers

  // Auto-collapse when sphere is being interacted with
  useEffect(() => {
    if (isSphereInteracting && snapPoint === 1) {
      setSnapPoint(0);
    }
  }, [isSphereInteracting, snapPoint]);

  // Report expansion state changes
  useEffect(() => {
    onExpandedChange?.(snapPoint === 1);
  }, [snapPoint, onExpandedChange]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleShare = async () => {
    if (!item) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: item.mintUrl || window.location.href
        });
      } catch {
        console.log('Share cancelled or failed');
      }
    }
  };

  const handleExpand = () => {
    setSnapPoint(1);
  };

  if (!item) return null;

  const isCollapsed = snapPoint === 0;
  const isExpanded = snapPoint === 1;
  
  // Check if description is long
  const isLongDescription = item.description.length > 200;

  return (
    <Sheet
      ref={ref}
      isOpen={isOpen}
      onClose={() => {
        onClose?.();
      }}
      snapPoints={snapPoints}
      initialSnap={0}
      onSnap={setSnapPoint}
      className="mobile-bottom-sheet"
    >
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content disableDrag={false} style={{ overflow: isCollapsed ? 'hidden' : 'auto' }}>
          <div className="bg-black/95 backdrop-blur-sm text-white font-mono border-t border-white/5" role="region" aria-label="NFT details" aria-live="polite">
            {/* Clickable Header Area - Entire collapsed section is clickable */}
            <div 
              onClick={isCollapsed ? handleExpand : undefined}
              className={`${isCollapsed ? 'cursor-pointer active:bg-white/5' : ''} transition-colors`}
            >
              {/* Drag Handle - Enhanced Visual Affordance */}
              <div className="flex justify-center pt-3 pb-3">
                <div className="w-10 h-1 bg-white/50 rounded-full shadow-sm" />
              </div>

              {/* Title Bar - Enhanced content in collapsed state */}
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm uppercase tracking-wider text-white truncate font-medium" aria-level={2}>
                      {item.title}
                    </h3>
                    {/* Show category in collapsed state for better context */}
                    {item.categories && item.categories.length > 0 && (
                      <span className="text-xs uppercase text-white/70 mt-1 block">
                        {item.categories[0]}
                      </span>
                    )}
                  </div>
                  {isCollapsed && (
                    <div className="w-2 h-2 bg-white/30 rounded-full opacity-50" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content - Only visible when expanded */}
            {isExpanded && (
              <div ref={contentRef} className="overflow-hidden">
                <div className="px-5 pb-6 space-y-4 border-t border-white/10 pt-5">
                    {/* Date */}
                    {item.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <CalendarBlank className="w-4 h-4" weight="regular" />
                        <time className="uppercase font-medium">{formatDate(item.createdAt)}</time>
                      </div>
                    )}

                    {/* Categories */}
                    {item.categories && item.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-white/10 rounded-full text-xs uppercase text-white/80 border border-white/10"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description with Show More/Less for long text */}
                    <div className="space-y-2">
                      <p className={`text-sm text-white/80 leading-relaxed ${
                        !showFullDescription && isLongDescription ? 'line-clamp-3' : ''
                      }`} aria-label="NFT description">
                        {item.description}
                      </p>
                      {isLongDescription && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-xs uppercase text-white/60 hover:text-white/80 transition-colors"
                        >
                          {showFullDescription ? 'Show Less' : 'Show More'}
                        </button>
                      )}
                    </div>

                    {/* Network Info */}
                    {(item.network || item.collectionAddress) && (
                      <div className="space-y-2 pt-3 border-t border-white/10">
                        {item.network && (
                          <div className="flex items-center gap-2 text-xs text-white/70">
                            <Globe className="w-3 h-3" weight="regular" />
                            <span className="uppercase">{item.network}</span>
                          </div>
                        )}
                        {item.collectionAddress && (
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3 h-3" weight="regular" />
                              <span className="font-mono">
                                {item.collectionAddress.slice(0, 6)}...{item.collectionAddress.slice(-4)}
                              </span>
                            </div>
                            <button 
                              onClick={() => navigator.clipboard.writeText(item.collectionAddress!)}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                              title="Copy address"
                            >
                              <Copy className="w-3 h-3" weight="regular" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-3">
                      {/* Primary CTA */}
                      {item.mintUrl && (
                        <a
                          href={item.mintUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-xl text-sm uppercase tracking-wider font-medium hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                          aria-label={`View ${item.title} on mint platform`}
                        >
                          VIEW ON MINT
                          <Export className="w-4 h-4" weight="regular" />
                        </a>
                      )}
                      
                      {/* Secondary Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setIsFavorited(!isFavorited)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/10 rounded-xl text-xs uppercase tracking-wider hover:bg-white/15 active:scale-[0.98] transition-all border border-white/10"
                          aria-label={isFavorited ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                        >
                          <Heart 
                            className={`w-4 h-4 ${isFavorited ? 'text-red-500' : 'text-white'}`} 
                            weight={isFavorited ? 'fill' : 'regular'} 
                          />
                          {isFavorited ? 'SAVED' : 'SAVE'}
                        </button>
                        <button
                          onClick={handleShare}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white/10 rounded-xl text-xs uppercase tracking-wider hover:bg-white/15 active:scale-[0.98] transition-all border border-white/10"
                          aria-label={`Share ${item.title} NFT`}
                        >
                          <ShareNetwork className="w-4 h-4" weight="regular" />
                          SHARE
                        </button>
                      </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop />
    </Sheet>
  );
}