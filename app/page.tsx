'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import { Search, ExternalLink, Calendar, Hash, Globe, X, Filter, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  
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

  // Mobile layout
  if (isMobile) {
    return (
      <main className="relative w-screen h-screen overflow-hidden bg-black font-mono">
        {/* Full-screen 3D Menu */}
        <div className="absolute inset-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="font-mono text-white text-xl">LOADING...</div>
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

        {/* Mobile FABs */}
        <AnimatePresence>
          {!isSearchOpen && !isFilterOpen && (
            <>
              {/* Filter FAB */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setIsFilterOpen(true)}
                className="fixed bottom-6 left-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg z-20 border border-white/20"
              >
                <Filter className="w-6 h-6 text-white" />
              </motion.button>

              {/* Search FAB */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setIsSearchOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg z-20 border border-white/20"
              >
                <Search className="w-6 h-6 text-white" />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Search Sheet */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-black/95 backdrop-blur-xl rounded-t-3xl z-30 max-h-[70vh] border-t border-white/10"
            >
              <div className="p-6">
                {/* Drag handle */}
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 block"
                />
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH NFTS"
                    className="w-full bg-white/10 rounded-2xl px-12 py-4 text-white placeholder-white/40 font-mono text-sm uppercase tracking-wider border border-white/20 focus:outline-none focus:border-white/40"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                    >
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  )}
                </div>
                
                {!isLoading && (
                  <div className="mt-4 font-mono text-xs text-white/60 uppercase tracking-wider text-center">
                    {items.length} RESULTS
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFilterOpen(false)}
                className="fixed inset-0 bg-black/50 z-30"
              />
              
              {/* Drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-[80vw] max-w-xs bg-black/95 backdrop-blur-xl z-40 border-r border-white/10"
              >
                <div className="p-6 h-full overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                      FILTER
                    </h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="p-2 -mr-2"
                    >
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        handleCategoryChange(null);
                        setIsFilterOpen(false);
                      }}
                      className={`flex items-center w-full font-mono text-left py-3 transition-all duration-200 text-sm relative group ${
                        activeCategories.length === 0
                          ? 'text-white'
                          : 'text-white/40'
                      }`}
                    >
                      <span 
                        className={`inline-block w-4 h-[1px] mr-4 transition-all duration-200 ${
                          activeCategories.length === 0 ? 'bg-white' : 'bg-transparent'
                        }`} 
                      />
                      <span className="uppercase tracking-[0.08em]">
                        ALL
                      </span>
                    </button>
                    
                    {categories.map((category) => {
                      const isActive = activeCategories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            handleCategoryChange(category);
                            if (!isActive) setIsFilterOpen(false);
                          }}
                          className={`flex items-center w-full font-mono text-left py-3 transition-all duration-200 text-sm relative group ${
                            isActive
                              ? 'text-white'
                              : 'text-white/40'
                          }`}
                        >
                          <span 
                            className={`inline-block w-4 h-[1px] mr-4 transition-all duration-200 ${
                              isActive ? 'bg-white' : 'bg-transparent'
                            }`} 
                          />
                          <span className="uppercase tracking-[0.08em]">
                            {category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Item Details Sheet */}
        <AnimatePresence>
          {focusedItem && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { velocity }) => {
                if (velocity.y > 500) setFocusedItem(null);
              }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-black/95 backdrop-blur-xl rounded-t-3xl z-50 max-h-[80vh] border-t border-white/10"
            >
              {/* Drag handle */}
              <div className="p-3">
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 overflow-y-auto">
                <h2 className="font-mono text-lg uppercase tracking-wider mb-3">
                  {focusedItem.title}
                </h2>
                
                {/* Categories */}
                {focusedItem.categories && focusedItem.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {focusedItem.categories.map((cat, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-white/10 rounded-full font-mono text-xs uppercase tracking-wider text-white/80"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Date */}
                <div className="flex items-center gap-2 font-mono text-xs text-white/60 mb-4">
                  <Calendar className="w-3 h-3" />
                  <time className="uppercase">{formatDate(focusedItem.createdAt)}</time>
                </div>
                
                {/* Description */}
                <p className="font-mono text-sm text-white/80 leading-relaxed mb-6">
                  {focusedItem.description}
                </p>
                
                {/* Metadata */}
                {(focusedItem.network || focusedItem.collectionAddress) && (
                  <div className="space-y-2 mb-6 py-4 border-t border-white/10">
                    {focusedItem.network && (
                      <div className="flex items-center gap-2 font-mono text-xs text-white/60">
                        <Globe className="w-3 h-3" />
                        <span className="uppercase">{focusedItem.network}</span>
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
                
                {/* CTA Button */}
                {focusedItem.mintUrl && (
                  <a 
                    href={focusedItem.mintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-white text-black rounded-2xl font-mono text-sm uppercase tracking-wider text-center"
                  >
                    VIEW ON MINT
                    <ExternalLink className="inline-block w-4 h-4 ml-2" />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                    <Minimize2 className="w-4 h-4 text-white/60 group-hover:text-white" />
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
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
            <Maximize2 className="w-4 h-4 text-white/60 group-hover:text-white" />
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
                  <Calendar className="w-3 h-3" />
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
                    <ExternalLink className="w-4 h-4" />
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