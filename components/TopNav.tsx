'use client';

import { useState, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function TopNav({ searchQuery, onSearchChange }: TopNavProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClearSearch = () => {
    onSearchChange('');
    setSubmittedQuery('');
    searchInputRef.current?.focus();
  };

  const handleSubmitSearch = () => {
    if (searchQuery) {
      setSubmittedQuery(searchQuery);
      searchInputRef.current?.blur();
    }
  };

  const handleSearchFocus = () => {
    setIsFocused(true);
  };

  const handleSearchBlur = () => {
    setIsFocused(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black border-b border-white/10 z-50">
      <div className="h-full px-6 grid grid-cols-3 items-center">
        {/* Logo/Title - Left Column */}
        <div className="flex items-center">
          <h1 className="font-mono text-white uppercase text-sm tracking-[0.08em]">
            DESIGN EVERYDAYS
          </h1>
        </div>

        {/* Center Search - Middle Column */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <div 
              className={`
                relative flex items-center rounded-full overflow-hidden
                transition-all duration-200
                ${isFocused || searchQuery 
                  ? 'bg-white/8 border border-white/10' 
                  : 'bg-white/5 border border-transparent'
                }
              `}
            >
              <Search 
                size={16} 
                className={`
                  absolute left-4 transition-colors duration-200
                  ${isFocused || searchQuery ? 'text-white' : 'text-white/40'}
                `}
              />
              
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    e.preventDefault();
                    handleSubmitSearch();
                  }
                }}
                placeholder="SEARCH"
                className={`
                  w-full bg-transparent text-white placeholder-white/40
                  font-mono text-xs uppercase tracking-[0.08em]
                  pl-10 ${searchQuery ? 'pr-12' : 'pr-10'} py-3 outline-none
                  transition-all duration-200
                  focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus-visible:ring-offset-black
                `}
              />

              {/* Smart button toggle: Arrow for submit, Clear for active search */}
              {searchQuery && (
                searchQuery !== submittedQuery ? (
                  /* Submit button with arrow icon */
                  <button
                    onClick={handleSubmitSearch}
                    className="absolute right-3 transition-all duration-200 opacity-100 translate-x-0"
                    aria-label="Submit search"
                  >
                    <ArrowRight 
                      size={14} 
                      className="text-white/60 hover:text-white transition-colors"
                    />
                  </button>
                ) : (
                  /* Clear button */
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 transition-all duration-200 opacity-100 translate-x-0"
                    aria-label="Clear search"
                  >
                    <X 
                      size={14} 
                      className="text-white/60 hover:text-white transition-colors"
                    />
                  </button>
                )
              )}
            </div>

          </div>
        </div>

        {/* About Link - Right Column */}
        <div className="flex items-center justify-end">
          <button 
            className="font-mono text-white/60 hover:text-white uppercase text-sm tracking-[0.08em] transition-colors"
            onClick={() => console.log('About page - coming soon')}
          >
            ABOUT
          </button>
        </div>
      </div>
    </nav>
  );
}