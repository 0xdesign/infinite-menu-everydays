'use client';

interface MobileHeaderProps {
  onFilterClick: () => void;
  onSearchClick: () => void;
}

export default function MobileHeader({ onFilterClick, onSearchClick }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-black z-50 md:hidden">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Filter Button */}
        <button
          onClick={onFilterClick}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Open filters"
        >
          <span className="font-mono text-white text-xs uppercase tracking-[0.08em]">
            FILTER
          </span>
        </button>

        {/* Search Button */}
        <button
          onClick={onSearchClick}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Open search"
        >
          <span className="font-mono text-white text-xs uppercase tracking-[0.08em]">
            SEARCH
          </span>
        </button>
      </div>
    </header>
  );
}