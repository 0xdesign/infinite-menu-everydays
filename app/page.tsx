'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import { Search, ExternalLink, Calendar, Hash, Globe } from 'lucide-react';

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
  id: number;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-mono">
      {/* Search Bar - Sticky Top */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-white/10">
        <div className="px-6 py-4">
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NFTs by title, description, or category..."
              className="w-full font-mono text-sm bg-white/10 border border-white/20 rounded-full px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15"
            />
            {!isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="font-mono text-xs text-white/60">
                  {items.length} results
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Three Column Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Categories Sidebar */}
        <aside className="w-64 bg-black/90 backdrop-blur border-r border-white/10 p-4 overflow-y-auto">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/60 mb-4">
            Categories
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`w-full font-mono text-xs px-3 py-2 rounded-full text-left transition-colors ${
                activeCategories.length === 0
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`w-full font-mono text-xs px-3 py-2 rounded-full text-left transition-colors ${
                  activeCategories.includes(category)
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
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
          <aside className="w-80 bg-black/90 backdrop-blur border-l border-white/10 p-6 overflow-y-auto">
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
                    className="inline-flex items-center gap-2 font-mono text-sm bg-white text-black px-4 py-2 rounded-full hover:bg-white/90 transition-colors"
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

      {/* Mobile Menu Toggle - Hidden on Desktop */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed bottom-4 left-4 z-50 p-3 bg-white/10 backdrop-blur rounded-full"
      >
        <div className="w-6 h-6 flex flex-col justify-center gap-1">
          <span className="block w-full h-0.5 bg-white"></span>
          <span className="block w-full h-0.5 bg-white"></span>
          <span className="block w-full h-0.5 bg-white"></span>
        </div>
      </button>
    </main>
  );
}