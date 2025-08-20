'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function TopNav({ searchQuery, onSearchChange }: TopNavProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep search expanded if there's a query
  useEffect(() => {
    if (searchQuery) {
      setIsSearchExpanded(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchBlur = () => {
    // Only collapse if there's no search query
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  const handleClearSearch = () => {
    onSearchChange('');
    // Keep the search bar expanded and focused after clearing
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-black border-b border-white/10 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="font-mono text-white uppercase text-sm tracking-[0.08em]">
              DESIGN EVERYDAYS
            </h1>
          </div>

          {/* Center Search */}
          <div className="flex-1 flex justify-center mx-8">
            <div 
              className={`
                relative flex items-center bg-white/10 rounded-full
                transition-all duration-300 ease-out
                ${isSearchExpanded || searchQuery ? 'w-full max-w-md' : 'w-32'}
              `}
            >
              <button
                onClick={handleSearchClick}
                className="absolute left-3 text-white/60 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
              
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onBlur={handleSearchBlur}
                placeholder="SEARCH"
                className={`
                  w-full bg-transparent text-white placeholder-white/40
                  font-mono text-xs uppercase tracking-[0.08em]
                  pl-10 ${searchQuery ? 'pr-10' : 'pr-4'} py-2 outline-none
                  ${isSearchExpanded || searchQuery ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                  transition-opacity duration-200
                `}
              />

              {/* Clear button - shows when there's search text */}
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 text-white/60 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              
              {/* Collapsed state - only show if not expanded and no query */}
              {!isSearchExpanded && !searchQuery && (
                <span 
                  className="font-mono text-xs text-white/60 uppercase tracking-[0.08em] pl-10 pr-4 py-2 cursor-pointer"
                  onClick={handleSearchClick}
                >
                  SEARCH
                </span>
              )}
            </div>
          </div>

          {/* About Link */}
          <div className="flex items-center">
            <button 
              className="font-mono text-white/60 hover:text-white uppercase text-sm tracking-[0.08em] transition-colors"
              onClick={() => console.log('About page - coming soon')}
            >
              ABOUT
            </button>
          </div>
        </div>
      </nav>

      {/* Active Search Indicator - shows below nav when searching */}
      {searchQuery && (
        <div className="fixed top-16 left-0 right-0 h-8 bg-black/80 backdrop-blur-sm border-b border-white/10 z-40 flex items-center px-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-white/60 text-xs uppercase tracking-[0.08em]">
              Searching:
            </span>
            <span className="font-mono text-white text-xs uppercase tracking-[0.08em] px-2 py-0.5 bg-white/10 rounded">
              &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              onClick={handleClearSearch}
              className="ml-2 text-white/40 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}