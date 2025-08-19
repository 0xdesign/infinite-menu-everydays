'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlass, Funnel } from 'phosphor-react';
import { motion } from 'framer-motion';

interface UltraMinimalTopBarProps {
  onSearchClick: () => void;
  onFilterClick: () => void;
  forceHide?: boolean;
}

export default function UltraMinimalTopBar({
  onSearchClick,
  onFilterClick,
  forceHide = false
}: UltraMinimalTopBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (forceHide) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    
    // Auto-hide after 3 seconds
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    // Show on any touch
    const handleTouch = () => {
      setIsVisible(true);
    };

    document.addEventListener('touchstart', handleTouch);
    document.addEventListener('mousemove', handleTouch);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('mousemove', handleTouch);
    };
  }, [forceHide]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      className="fixed top-0 left-0 right-0 z-40 h-10"
    >
      <div className="flex items-center justify-between px-4 h-full">
        <button
          onClick={onFilterClick}
          className="p-2 -ml-2"
          aria-label="Filter"
        >
          <Funnel className="w-4 h-4 text-white/60" />
        </button>

        <button
          onClick={onSearchClick}
          className="p-2 -mr-2"
          aria-label="Search"
        >
          <MagnifyingGlass className="w-4 h-4 text-white/60" />
        </button>
      </div>
    </motion.div>
  );
}