'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel, X } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopUtilityBarProps {
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  searchQuery: string;
  autoHide?: boolean;
  forceHide?: boolean;
}

export default function TopUtilityBar({
  onSearchChange,
  onFilterClick,
  searchQuery,
  autoHide = true,
  forceHide = false
}: TopUtilityBarProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastTouchY, setLastTouchY] = useState(0);

  useEffect(() => {
    if (forceHide) {
      setIsVisible(false);
      return;
    }
    
    // Always start visible when not force hidden
    setIsVisible(true);
    
    if (!autoHide) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isInteracting = false;

    const showBar = () => {
      setIsVisible(true);
      clearTimeout(timeoutId);
      
      if (!isInteracting) {
        timeoutId = setTimeout(() => {
          if (!isSearchExpanded) {
            setIsVisible(false);
          }
        }, 2000); // Faster hide - more minimal
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      setLastTouchY(e.touches[0].clientY);
      isInteracting = true;
      showBar();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - lastTouchY;
      
      // Show bar when scrolling down from top
      if (currentY < 100 || deltaY > 5) {
        showBar();
      }
      
      setLastTouchY(currentY);
    };

    const handleTouchEnd = () => {
      isInteracting = false;
      showBar();
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    // Initial timer
    showBar();

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [autoHide, isSearchExpanded, lastTouchY, forceHide]);

  const handleSearchClick = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      // Focus will be set after animation completes
      setTimeout(() => {
        const input = document.getElementById('mobile-search-input');
        input?.focus();
      }, 300);
    } else {
      onSearchChange('');
    }
  };

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -60 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 right-0 z-40 h-12"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md border-b border-white/5" />
      
      <div className="relative h-full flex items-center justify-between px-4">
        {/* Filter Button */}
        <button
          onClick={onFilterClick}
          className="p-2 -ml-2 rounded-lg active:bg-white/10 transition-colors"
          aria-label="Filter"
        >
          <Funnel className="w-5 h-5 text-white/80" />
        </button>

        {/* Search Section */}
        <div className="flex items-center">
          <AnimatePresence mode="wait">
            {isSearchExpanded ? (
              <motion.div
                key="search-expanded"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center"
              >
                <input
                  id="mobile-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="SEARCH"
                  className="w-[200px] bg-white/10 rounded-full px-4 py-1.5 text-sm font-mono uppercase text-white placeholder-white/40 focus:outline-none focus:bg-white/15"
                />
                <button
                  onClick={handleSearchClick}
                  className="ml-2 p-2 rounded-lg active:bg-white/10 transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="search-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSearchClick}
                className="p-2 -mr-2 rounded-lg active:bg-white/10 transition-colors"
                aria-label="Search"
              >
                <MagnifyingGlass className="w-5 h-5 text-white/80" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}