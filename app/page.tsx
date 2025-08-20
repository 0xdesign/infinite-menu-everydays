'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import { MagnifyingGlass, Export, CalendarBlank, Hash, Globe, X, ArrowsOut } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MinimalBottomSheet from '@/components/mobile/MinimalBottomSheet';
import TopUtilityBar from '@/components/mobile/TopUtilityBar';
import SearchOverlay from '@/components/mobile/UltraMinimalSearch';
import FilterPanel from '@/components/mobile/FilterPanel';
import ImageFullscreenModal from '@/components/ImageFullscreenModal';

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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isSphereInteracting, setIsSphereInteracting] = useState(false);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

  // Track viewport size for dynamic button container sizing
  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  // Calculate focused NFT container size based on 3D sphere mathematics
  const getFocusedImageSize = () => {
    // Based on 3D analysis: focused item occupies ~37% of viewport height
    // Angular diameter ≈ 0.4898 radians, viewport FOV varies with sphere size
    // Using 37% as optimal ratio from mathematical analysis
    const containerSize = Math.round(viewportSize.height * 0.37);
    
    // Clamp between reasonable bounds
    return Math.max(200, Math.min(containerSize, 500));
  };



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
              onDragStateChange={setIsDragging}
            />
          )}

          {/* Fullscreen Button Overlay for Mobile */}
          <AnimatePresence>
            {focusedItem && !isDragging && !isBottomSheetExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ 
                  width: `${getFocusedImageSize()}px`,
                  height: `${getFocusedImageSize()}px`,
                  border: '2px solid blue',
                  borderRadius: '50%'
                }}
              >
                <button
                  onClick={() => setImageModalOpen(true)}
                  className="pointer-events-auto absolute top-1 right-1 w-11 h-11 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center text-white active:bg-black/70 active:scale-95 transition-all duration-150"
                  aria-label={`View ${focusedItem.title} in fullscreen`}
                >
                  <ArrowsOut className="w-[18px] h-[18px] text-white" weight="regular" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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

        {/* Image Fullscreen Modal */}
        <ImageFullscreenModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          item={focusedItem}
        />

      </main>
    );
  }

  // Desktop layout
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-mono">
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
              onDragStateChange={setIsDragging}
            />
          )}

          {/* Fullscreen Button Overlay for Desktop */}
          <AnimatePresence>
            {focusedItem && !isDragging && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ 
                  width: `${getFocusedImageSize()}px`,
                  height: `${getFocusedImageSize()}px`,
                  border: '2px solid lime',
                  borderRadius: '50%'
                }}
              >
                <button
                  onClick={() => setImageModalOpen(true)}
                  className="pointer-events-auto absolute top-1 right-1 w-11 h-11 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center text-white/90 hover:bg-black/60 hover:scale-105 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
                  aria-label={`View ${focusedItem.title} in fullscreen`}
                  tabIndex={focusedItem && !isDragging ? 0 : -1}
                >
                  <ArrowsOut className="w-[18px] h-[18px] text-white" weight="regular" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Debug Info for Container Sizing */}
          <div className="absolute top-4 left-4 z-50 bg-black/80 text-white p-2 text-xs">
            <div>Platform: {isMobile ? 'Mobile' : 'Desktop'}</div>
            <div>Viewport: {viewportSize.width} × {viewportSize.height}</div>
            <div>Container Size: {getFocusedImageSize()}px</div>
            <div>Focused: {focusedItem ? focusedItem.title.substring(0, 20) : 'None'}</div>
            <div>Dragging: {isDragging ? 'Yes' : 'No'}</div>
            <div className="text-yellow-300">37% of viewport height (3D math-based)</div>
          </div>

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

      {/* Image Fullscreen Modal */}
      <ImageFullscreenModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        item={focusedItem}
      />
    </main>
  );
}