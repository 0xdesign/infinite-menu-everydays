'use client';

interface FilterSidebarProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryToggle: (category: string) => void;
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

export default function FilterSidebar({ 
  categories, 
  selectedCategory, 
  onCategoryToggle 
}: FilterSidebarProps) {
  
  const isAllSelected = !selectedCategory;
  
  // Sort categories based on predefined order
  const sortedCategories = [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.toUpperCase());
    const bIndex = CATEGORY_ORDER.indexOf(b.toUpperCase());
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const handleAllClick = () => {
    // Clear selection to show all items
    if (selectedCategory) {
      onCategoryToggle(selectedCategory);
    }
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-40 bg-black border-r border-white/10 z-40 overflow-y-auto">
      <div className="p-6">
        <div className="space-y-3">
          {/* ALL button */}
          <button
            onClick={handleAllClick}
            className="relative block w-full text-left group"
          >
            {isAllSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white" />
            )}
            <span 
              className={`
                font-mono uppercase text-xs transition-all duration-200
                ${isAllSelected 
                  ? 'text-white tracking-[0.08em] pl-6' 
                  : 'text-white/60 hover:text-white/80 tracking-normal'
                }
              `}
            >
              ALL
            </span>
          </button>

          {/* Category buttons */}
          {sortedCategories.map((category) => {
            const isActive = selectedCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => onCategoryToggle(category)}
                className="relative block w-full text-left group"
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white" />
                )}
                <span 
                  className={`
                    font-mono uppercase text-xs transition-all duration-200
                    ${isActive 
                      ? 'text-white tracking-[0.08em] pl-6' 
                      : 'text-white/60 hover:text-white/80 tracking-normal'
                    }
                  `}
                >
                  {category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}