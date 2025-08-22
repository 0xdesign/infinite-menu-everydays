'use client';

import { useRef, useEffect } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';

interface MobileSearchModalProps {
  isOpen: boolean;
  searchQuery: string;
  submittedQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClose: () => void;
}

export default function MobileSearchModal({ 
  isOpen,
  searchQuery,
  submittedQuery,
  onSearchChange,
  onSearchSubmit,
  onClose 
}: MobileSearchModalProps) {
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (searchQuery) {
      onSearchSubmit();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm md:hidden">
      {/* Header */}
      <div className="flex items-center p-4">
        <div className="flex-1 relative">
          <div className="flex items-center bg-white/8 rounded-full overflow-hidden border border-white/10">
            <Search size={16} className="absolute left-4 text-white/60" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="SEARCH"
              className={`w-full bg-transparent text-white placeholder-white/40 font-mono text-xs uppercase tracking-[0.08em] py-3 pl-10 ${searchQuery ? 'pr-12' : 'pr-10'} outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-black`}
            />
            {/* Smart button toggle: Arrow for submit, Clear for active search */}
            {searchQuery && (
              searchQuery !== submittedQuery ? (
                /* Submit button with arrow icon */
                <button
                  onClick={handleSubmit}
                  className="absolute right-3 transition-all duration-200 opacity-100 translate-x-0"
                  aria-label="Submit search"
                >
                  <ArrowRight size={14} className="text-white/60 hover:text-white transition-colors" />
                </button>
              ) : (
                /* Clear button */
                <button
                  onClick={handleClear}
                  className="absolute right-3 transition-all duration-200 opacity-100 translate-x-0"
                  aria-label="Clear search"
                >
                  <X size={14} className="text-white/60 hover:text-white transition-colors" />
                </button>
              )
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close search"
        >
          <X size={24} />
        </button>
      </div>

      {/* Search hint */}
      <div className="px-4 mt-2">
        <p className="font-mono text-white/30 text-xs uppercase tracking-[0.08em]">
          {searchQuery.length === 0 && 'START TYPING TO SEARCH'}
          {searchQuery.length > 0 && searchQuery.length < 3 && `${searchQuery.length} CHARACTERS`}
          {searchQuery.length >= 3 && `SEARCHING FOR "${searchQuery.toUpperCase()}"`}
        </p>
      </div>
    </div>
  );
}