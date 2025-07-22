'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import CategoryBar from '@/components/CategoryBar';

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
}

export default function Home() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    // Fetch items when category or search changes
    setIsLoading(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchInfiniteMenuData(activeCategory, searchQuery)
        .then((data) => {
          console.log('Fetched items:', data.length, 'items for category:', activeCategory || 'All', 'search:', searchQuery);
          setItems(data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch items:', error);
          setIsLoading(false);
        });
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeCategory, searchQuery]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Category Bar */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <CategoryBar 
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Search Bar */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search NFTs..."
          className="px-4 py-2 bg-black/50 border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-white/40"
        />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}

      {/* Infinite Menu - only render when we have items */}
      {!isLoading && items.length > 0 && (
        <div className="w-full h-full">
          <InfiniteMenu items={items} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-center">
            <p className="text-xl mb-2">No NFTs found</p>
            <p className="text-white/60">
              {searchQuery ? 'Try a different search term' : 'No items in this category'}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}