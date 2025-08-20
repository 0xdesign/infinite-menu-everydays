'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'phosphor-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  activeCategories: string[];
  onCategoryChange: (category: string | null) => void;
}

export default function FilterPanel({
  isOpen,
  onClose,
  categories,
  activeCategories,
  onCategoryChange
}: FilterPanelProps) {
  const handleCategoryClick = (category: string | null) => {
    onCategoryChange(category);
    // Auto-close after selection
    setTimeout(onClose, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-30"
          />
          
          {/* Filter Panel */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-xl z-40 border-b border-white/10"
            style={{ paddingTop: '48px' }} // Account for top bar
          >
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                  FILTER BY CATEGORY
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg active:bg-white/10"
                  aria-label="Close filter"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
              
              {/* Categories */}
              <div className="space-y-1">
                {/* All Option */}
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`flex items-center w-full font-mono text-left py-3 transition-all duration-200 text-sm relative ${
                    activeCategories.length === 0
                      ? 'text-white'
                      : 'text-white/40'
                  }`}
                >
                  <span 
                    className={`inline-block w-4 h-[1px] mr-4 transition-all duration-200 ${
                      activeCategories.length === 0 ? 'bg-white' : 'bg-transparent'
                    }`} 
                  />
                  <span className="uppercase tracking-[0.08em]">
                    ALL
                  </span>
                </button>
                
                {/* Category Options */}
                {categories.map((category) => {
                  const isActive = activeCategories.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`flex items-center w-full font-mono text-left py-3 transition-all duration-200 text-sm relative ${
                        isActive
                          ? 'text-white'
                          : 'text-white/40'
                      }`}
                    >
                      <span 
                        className={`inline-block w-4 h-[1px] mr-4 transition-all duration-200 ${
                          isActive ? 'bg-white' : 'bg-transparent'
                        }`} 
                      />
                      <span className="uppercase tracking-[0.08em]">
                        {category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}