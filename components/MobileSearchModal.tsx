'use client';

import { useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface MobileSearchModalProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
}

export default function MobileSearchModal({ 
  isOpen,
  searchQuery,
  onSearchChange,
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

  return (
    <div className="fixed inset-0 z-[60] bg-black md:hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10">
        <div className="flex-1 flex items-center bg-white/10 rounded-full px-4">
          <Search size={16} className="text-white/60" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SEARCH"
            className="flex-1 bg-transparent text-white placeholder-white/40 font-mono text-sm uppercase tracking-[0.08em] py-3 px-3 outline-none"
          />
          {/* Clear button inside search bar */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 text-white/60 hover:text-white transition-colors"
          aria-label="Close search"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search Results Info */}
      <div className="p-4">
        <p className="font-mono text-white/40 text-xs uppercase tracking-[0.08em]">
          {searchQuery ? `Searching for "${searchQuery}"` : 'Type to search...'}
        </p>
      </div>
    </div>
  );
}