'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import { MagnifyingGlass, Export, CalendarBlank, Hash, Globe, X, ArrowsOut, ArrowsIn } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MinimalBottomSheet from '@/components/mobile/MinimalBottomSheet';
import TopUtilityBar from '@/components/mobile/TopUtilityBar';
import SearchOverlay from '@/components/mobile/UltraMinimalSearch';
import FilterPanel from '@/components/mobile/FilterPanel';

const InfiniteMenu = dynamic(
  () => import('@/components/InfiniteMenu'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p className="text-xl">Loading 3D menu...</p>
      </div>
    )
  }
);

interface MenuItem {
  id?: number;
  image: string;
  link: string;
  title: string;
  description: string;
  mintUrl?: string | null;
  createdAt?: string | null;
  categories?: string[];
  network?: string | null;
  collectionAddress?: string | null;
}

export default function Home() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [focusedItem, setFocusedItem] = useState<MenuItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSphereInteracting, setIsSphereInteracting] = useState(false);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
      // Fallback: just toggle the state for pseudo-fullscreen
      setIsFullscreen(prev => !prev);
    }
  }, []);

  // Fullscreen API handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      // Press 'F' to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        toggleFullscreen();
      }
      // ESC is handled by browser automatically
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleFullscreen]);

  // Auto-hide overlay in fullscreen after inactivity
  useEffect(() => {
    if (!isFullscreen) {
      setShowOverlay(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    
    const handleActivity = () => {
      setShowOverlay(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowOverlay(false);
      }, 3000);
    };

    // Show overlay on any mouse movement or touch
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    
    // Initial timer
    handleActivity();

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
    };
  }, [isFullscreen]);

  useEffect(() => {
    // Fetch items when categories or search changes
    setIsLoading(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchInfiniteMenuData(activeCategories, searchQuery)
        .then((data) => {
          console.log('Fetched items:', data.length, 'items for categories:', activeCategories.join(', ') || 'All', 'search:', searchQuery);
          setItems(data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch items:', error);
          setIsLoading(false);
        });
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeCategories, searchQuery]);

  const handleCategoryChange = (category: string | null) => {
    if (category === null) {
      setActiveCategories([]);
      return;
    }
    setActiveCategories((prev) => {
      const exists = prev.includes(category);
      if (exists) return prev.filter((c) => c !== category);
      return [...prev, category];
    });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Detect sphere interaction for mobile
  useEffect(() => {
    if (!isMobile) return;
    
      let interactionTimeout: NodeJS.Timeout;

      const handleInteractionStart = () => {
        setIsSphereInteracting(true);
        clearTimeout(interactionTimeout);
      };

      const handleInteractionEnd = () => {
        // Keep interaction state true for a brief moment to ensure smooth transition
        interactionTimeout = setTimeout(() => {
          setIsSphereInteracting(false);
        }, 300);
      };

      const handleTouchMove = (e: TouchEvent) => {
        // Only consider it sphere interaction if touch is on the canvas area
        const target = e.target as HTMLElement;
        if (target.tagName === 'CANVAS') {
          if (!isSphereInteracting) {
            handleInteractionStart();
          }
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        // Check if mouse is down (dragging)
        if (e.buttons === 1) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'CANVAS') {
            if (!isSphereInteracting) {
              handleInteractionStart();
            }
          }
        }
      };

      document.addEventListener('touchstart', handleInteractionStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleInteractionEnd);
      document.addEventListener('mousedown', handleInteractionStart);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleInteractionEnd);

      return () => {
        clearTimeout(interactionTimeout);
        document.removeEventListener('touchstart', handleInteractionStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleInteractionEnd);
        document.removeEventListener('mousedown', handleInteractionStart);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleInteractionEnd);
      };
  }, [isMobile, isSphereInteracting]);

  // Mobile layout
  if (isMobile) {
    return (
      <main className="relative w-screen h-screen overflow-hidden bg-black font-mono">
        {/* Top utility bar */}
        <TopUtilityBar
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          searchQuery={searchQuery}
          forceHide={isBottomSheetExpanded}
        />

        {/* Search overlay */}
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Filter Panel */}
        <FilterPanel
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          categories={categories}
          activeCategories={activeCategories}
          onCategoryChange={handleCategoryChange}
        />

        {/* Full-screen 3D Menu */}
        <div className="absolute inset-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/30 text-xs font-mono uppercase">Loading</div>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <InfiniteMenu 
              items={items} 
              initialFocusId={activeCategories.length === 0 && !searchQuery ? 755 : undefined}
              onItemFocus={setFocusedItem}
            />
          )}

          {!isLoading && items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="font-mono text-white text-center">
                <p className="text-xl mb-2 uppercase">NO NFTS FOUND</p>
                <p className="text-white/60 text-sm">
                  {searchQuery ? 'TRY A DIFFERENT SEARCH' : 'NO ITEMS IN THIS CATEGORY'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Minimal bottom sheet with working touch */}
        <MinimalBottomSheet
          item={focusedItem}
          isOpen={!!focusedItem}
          onClose={() => setFocusedItem(null)}
          isSphereInteracting={isSphereInteracting}
          onExpandedChange={setIsBottomSheetExpanded}
        />

      </main>
    );
  }

  // Desktop layout (existing)
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-mono">
      {/* Fullscreen Layout */}
      {isFullscreen ? (
        <>
          {/* Full-screen 3D Menu */}
          <div className="absolute inset-0">
            {!isLoading && items.length > 0 && (
              <InfiniteMenu 
                items={items} 
                initialFocusId={activeCategories.length === 0 && !searchQuery ? 755 : undefined}
                onItemFocus={setFocusedItem}
              />
            )}
          </div>

          {/* Minimal Overlay Controls */}
          <AnimatePresence>
            {showOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-x-0 top-0 z-50"
              >
                {/* Top Bar */}
                <div className="flex justify-between items-start p-6">
                  {/* Empty left side for balance */}
                  <div />
                  
                  {/* Exit Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="group flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-all duration-200"
                    aria-label="Exit fullscreen"
                  >
                    <ArrowsIn className="w-4 h-4 text-white/60 group-hover:text-white" />
                    <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/60 group-hover:text-white">
                      EXIT
                    </span>
                  </button>
                </div>

                {/* Bottom Info - Only when item is focused */}
                {focusedItem && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="absolute bottom-0 left-0 p-6"
                  >
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 max-w-md">
                      <h3 className="font-mono text-sm uppercase tracking-wider text-white mb-1">
                        {focusedItem.title}
                      </h3>
                      {focusedItem.categories && focusedItem.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {focusedItem.categories.slice(0, 3).map((cat, idx) => (
                            <span key={idx} className="font-mono text-xs text-white/60">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          {/* Normal Layout */}
          {/* Search Bar - Sticky Top */}
          <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-white/10">
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-2xl mx-auto relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NFTs by title, description, or category..."
              className="w-full font-mono text-sm bg-white/10 border border-white/20 rounded-full px-4 py-3 pl-10 pr-24 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-white/60 hover:text-white" />
                </button>
              )}
              {!isLoading && (
                <span className="font-mono text-xs text-white/60">
                  {items.length} results
                </span>
              )}
            </div>
          </div>
          
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="group flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
            aria-label="Enter fullscreen"
          >
            <ArrowsOut className="w-4 h-4 text-white/60 group-hover:text-white" />
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/60 group-hover:text-white">
              FULLSCREEN
            </span>
          </button>
        </div>
      </div>
    </header>

      {/* Three Column Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Minimal Categories Sidebar */}
        <aside className="w-40 p-4 space-y-0.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/40 mb-4 font-medium">
            Categories
          </div>
          
          <button
            onClick={() => handleCategoryChange(null)}
            className={`flex items-center w-full font-mono text-left py-1.5 transition-all duration-200 text-xs relative group ${
              activeCategories.length === 0
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span 
              className={`inline-block w-4 h-[1px] mr-3 transition-all duration-200 ${
                activeCategories.length === 0 ? 'bg-white' : 'bg-transparent'
              }`} 
            />
            <span className="uppercase tracking-[0.08em] font-normal">
              ALL
            </span>
          </button>
          
          {categories.map((category) => {
            const isActive = activeCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`flex items-center w-full font-mono text-left py-1.5 transition-all duration-200 text-xs relative group ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <span 
                  className={`inline-block w-4 h-[1px] mr-3 transition-all duration-200 ${
                    isActive ? 'bg-white' : 'bg-transparent'
                  }`} 
                />
                <span className="uppercase tracking-[0.08em] font-normal">
                  {category}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Main Content - 3D Menu */}
        <div className="flex-1 relative">
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="font-mono text-white text-xl">Loading...</div>
            </div>
          )}

          {/* Infinite Menu - only render when we have items */}
          {!isLoading && items.length > 0 && (
            <InfiniteMenu 
              items={items} 
              initialFocusId={activeCategories.length === 0 && !searchQuery ? 755 : undefined}
              onItemFocus={setFocusedItem}
            />
          )}

          {/* Empty state */}
          {!isLoading && items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="font-mono text-white text-center">
                <p className="text-xl mb-2">No NFTs found</p>
                <p className="text-white/60">
                  {searchQuery ? 'Try a different search term' : 'No items in this category'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Focused Item Details Panel */}
        {focusedItem && (
          <aside className="w-80 bg-black/90 backdrop-blur border-l border-white/5 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <header className="space-y-3">
                <h1 className="font-mono text-xl font-bold text-white break-words">
                  {focusedItem.title}
                </h1>
                
                {/* Categories */}
                {focusedItem.categories && focusedItem.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {focusedItem.categories.map((cat, idx) => (
                      <span 
                        key={idx}
                        className="font-mono text-xs px-2 py-1 bg-white/10 rounded-full text-white/80"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Publication Date */}
                <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                  <CalendarBlank className="w-3 h-3" />
                  <time>{formatDate(focusedItem.createdAt)}</time>
                </div>
              </header>
              
              {/* Description */}
              <div className="space-y-2">
                <p className="font-mono text-sm text-white/80 leading-relaxed">
                  {focusedItem.description}
                </p>
              </div>

              {/* Metadata */}
              {(focusedItem.network || focusedItem.collectionAddress) && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {focusedItem.network && (
                    <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                      <Globe className="w-3 h-3" />
                      <span>{focusedItem.network}</span>
                    </div>
                  )}
                  {focusedItem.collectionAddress && (
                    <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                      <Hash className="w-3 h-3" />
                      <span className="truncate" title={focusedItem.collectionAddress}>
                        {focusedItem.collectionAddress.slice(0, 8)}...{focusedItem.collectionAddress.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* FAB Button - Mint URL */}
              {focusedItem.mintUrl && (
                <div className="pt-4">
                  <a 
                    href={focusedItem.mintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-xs bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-all duration-200 uppercase tracking-[0.08em]"
                  >
                    Visit Mint
                    <Export className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      </>
    )}
    </main>
  );
}