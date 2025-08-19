'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Heart, 
  Share2, 
  ExternalLink, 
  Calendar, 
  Hash, 
  Globe,
  ChevronDown,
  ChevronUp,
  Maximize2
} from 'lucide-react';

interface FloatingMetadataProps {
  item: {
    id?: number;
    title: string;
    description: string;
    mintUrl?: string | null;
    createdAt?: string | null;
    categories?: string[];
    network?: string | null;
    collectionAddress?: string | null;
  } | null;
  isVisible: boolean;
  onClose?: () => void;
  onExpand?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
}

type DisclosureLevel = 'minimal' | 'expanded' | 'full';

export default function FloatingMetadata({
  item,
  isVisible,
  onClose,
  onExpand,
  position = 'top-right',
  autoHide = true
}: FloatingMetadataProps) {
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>('minimal');
  const [isFavorited, setIsFavorited] = useState(false);

  const toggleDisclosure = useCallback(() => {
    setDisclosureLevel(prev => {
      if (prev === 'minimal') return 'expanded';
      if (prev === 'expanded') return 'minimal';
      return prev;
    });
  }, []);

  const handleFullView = useCallback(() => {
    setDisclosureLevel('full');
    onExpand?.();
  }, [onExpand]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!item) return null;

  // Position classes based on prop
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      x: position.includes('right') ? 100 : -100,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0,
      x: position.includes('right') ? 100 : -100,
      scale: 0.9,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed z-50 ${positionClasses[position]} w-[280px] md:w-[320px]`}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Tier 1: Minimal View - Always Visible */}
            <div className="p-4">
              {/* Header with Title and Actions */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-sm uppercase tracking-wider text-white truncate">
                    {item.title}
                  </h3>
                  {item.categories && item.categories.length > 0 && (
                    <span className="font-mono text-xs text-white/60 uppercase">
                      {item.categories[0]}
                    </span>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Favorite"
                  >
                    <Heart 
                      className={`w-4 h-4 ${isFavorited ? 'fill-white text-white' : 'text-white/60'}`} 
                    />
                  </button>
                  <button
                    onClick={() => navigator.share?.({ title: item.title, text: item.description })}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Share"
                  >
                    <Share2 className="w-4 h-4 text-white/60" />
                  </button>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expand/Collapse Button */}
              <button
                onClick={toggleDisclosure}
                className="w-full flex items-center justify-center gap-2 py-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
                  {disclosureLevel === 'minimal' ? 'More Info' : 'Less Info'}
                </span>
                {disclosureLevel === 'minimal' ? (
                  <ChevronDown className="w-3 h-3 text-white/60" />
                ) : (
                  <ChevronUp className="w-3 h-3 text-white/60" />
                )}
              </button>
            </div>

            {/* Tier 2: Expanded View - On Demand */}
            <AnimatePresence>
              {disclosureLevel === 'expanded' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 space-y-3">
                    {/* Date */}
                    {item.createdAt && (
                      <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                        <Calendar className="w-3 h-3" />
                        <time className="uppercase">{formatDate(item.createdAt)}</time>
                      </div>
                    )}

                    {/* Description Preview */}
                    <p className="font-mono text-xs text-white/80 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>

                    {/* All Categories */}
                    {item.categories && item.categories.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {item.categories.slice(1).map((cat, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-white/10 rounded-full font-mono text-xs uppercase text-white/60"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Network Info */}
                    {(item.network || item.collectionAddress) && (
                      <div className="space-y-1 pt-2 border-t border-white/5">
                        {item.network && (
                          <div className="flex items-center gap-2 font-mono text-xs text-white/50">
                            <Globe className="w-3 h-3" />
                            <span className="uppercase">{item.network}</span>
                          </div>
                        )}
                        {item.collectionAddress && (
                          <div className="flex items-center gap-2 font-mono text-xs text-white/50">
                            <Hash className="w-3 h-3" />
                            <span className="truncate" title={item.collectionAddress}>
                              {item.collectionAddress.slice(0, 8)}...{item.collectionAddress.slice(-6)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {item.mintUrl && (
                        <a 
                          href={item.mintUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/10 rounded-lg font-mono text-xs uppercase tracking-wider text-white hover:bg-white/20 transition-colors"
                        >
                          Mint
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={handleFullView}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/10 rounded-lg font-mono text-xs uppercase tracking-wider text-white hover:bg-white/20 transition-colors"
                      >
                        Full View
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Visual Indicator for Auto-Hide */}
          {autoHide && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3, ease: 'linear' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}