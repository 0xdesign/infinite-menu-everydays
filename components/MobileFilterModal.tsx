'use client';

import { X } from 'lucide-react';

interface MobileFilterModalProps {
  isOpen: boolean;
  categories: string[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClose: () => void;
}

const CATEGORY_ORDER = [
  'ALL',
  'PAYMENTS', 
  'TRADING',
  'AGENTS',
  'SOCIAL',
  'IDENTITY',
  'MESSAGING',
  'GATING',
  'PRIVACY',
  'REWARDS',
  'ART',
  'INVEST',
  'WALLET'
];

export default function MobileFilterModal({ 
  isOpen,
  categories, 
  selectedCategories, 
  onCategoryToggle,
  onClose 
}: MobileFilterModalProps) {
  
  if (!isOpen) return null;

  const isAllSelected = selectedCategories.length === 0;
  
  const sortedCategories = [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.toUpperCase());
    const bIndex = CATEGORY_ORDER.indexOf(b.toUpperCase());
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const handleAllClick = () => {
    if (!isAllSelected && selectedCategories.length > 0) {
      selectedCategories.forEach(cat => onCategoryToggle(cat));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="font-mono text-white uppercase text-sm tracking-[0.08em]">
          FILTER
        </h2>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Close filters"
        >
          <X size={20} />
        </button>
      </div>

      {/* Filter List */}
      <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        {/* ALL button */}
        <button
          onClick={handleAllClick}
          className="relative block w-full text-left"
        >
          {isAllSelected && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white" />
          )}
          <span 
            className={`
              font-mono uppercase text-sm transition-all duration-200
              ${isAllSelected 
                ? 'text-white tracking-[0.08em] pl-6' 
                : 'text-white/60 tracking-normal'
              }
            `}
          >
            ALL
          </span>
        </button>

        {/* Category buttons */}
        {sortedCategories.map((category) => {
          const isActive = selectedCategories.includes(category);
          
          return (
            <button
              key={category}
              onClick={() => {
                onCategoryToggle(category);
              }}
              className="relative block w-full text-left"
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white" />
              )}
              <span 
                className={`
                  font-mono uppercase text-sm transition-all duration-200
                  ${isActive 
                    ? 'text-white tracking-[0.08em] pl-6' 
                    : 'text-white/60 tracking-normal'
                  }
                `}
              >
                {category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Apply Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black border-t border-white/10">
        <button
          onClick={onClose}
          className="w-full py-3 bg-white text-black font-mono uppercase text-xs tracking-[0.08em] text-center"
        >
          APPLY FILTERS
        </button>
      </div>
    </div>
  );
}