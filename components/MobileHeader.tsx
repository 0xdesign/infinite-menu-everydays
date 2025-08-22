'use client';

interface MobileHeaderProps {
  onFilterClick: () => void;
  onSearchClick: () => void;
  activeFilterCount?: number;
  hasSearchQuery?: boolean;
}

export default function MobileHeader({ 
  onFilterClick, 
  onSearchClick, 
  activeFilterCount = 0,
  hasSearchQuery = false 
}: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-black z-50 md:hidden">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Filter Button */}
        <button
          onClick={onFilterClick}
          className={`px-4 py-2 rounded-full transition-colors ${
            activeFilterCount > 0 
              ? 'bg-white text-black' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          aria-label="Open filters"
        >
          <span className="font-mono text-xs uppercase tracking-[0.08em]">
            FILTER{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </span>
        </button>

        {/* Search Button */}
        <button
          onClick={onSearchClick}
          className={`px-4 py-2 rounded-full transition-colors ${
            hasSearchQuery
              ? 'bg-white text-black'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          aria-label="Open search"
        >
          <span className="font-mono text-xs uppercase tracking-[0.08em]">
            SEARCH
          </span>
        </button>
      </div>
    </header>
  );
}