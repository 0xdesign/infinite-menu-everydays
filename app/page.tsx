'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories, fetchInfiniteMenuDataPaginated } from '@/lib/supabase';
import { usePaginatedItems } from '@/lib/usePaginatedItems';
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
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination callback
  const fetchPaginatedData = useCallback(
    async (offset: number, limit: number) => {
      return fetchInfiniteMenuDataPaginated(offset, limit, activeCategory, searchTerm);
    },
    [activeCategory, searchTerm]
  );

  // Use pagination hook
  const {
    items: paginatedItems,
    totalCount,
    isLoading: isPaginationLoading,
    checkAndLoadAdjacent
  } = usePaginatedItems(allItems, {
    windowSize: 200,
    prefetchThreshold: 50,
    onFetch: fetchPaginatedData
  });

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    // Fetch items when category or search changes
    setIsLoading(true);
    fetchInfiniteMenuData(activeCategory)
      .then((data) => {
        console.log('Fetched items:', data.length, 'items for category:', activeCategory || 'All');
        setAllItems(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch items:', error);
        setIsLoading(false);
      });
  }, [activeCategory, searchTerm]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
    setSearchTerm(''); // Clear search when changing category
  };

  const handleActiveIndexChange = (index: number) => {
    checkAndLoadAdjacent(index);
  };

  // Use paginated items if we have more than window size, otherwise use all items
  const displayItems = allItems.length > 200 ? paginatedItems : allItems;

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
      <div className="absolute top-16 left-0 right-0 z-20 px-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search NFTs..."
          className="w-full max-w-md mx-auto block px-4 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Loading indicator */}
      {(isLoading || isPaginationLoading) && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-xl">Loading...</div>
        </div>
      )}

      {/* Item count indicator */}
      {totalCount > 0 && (
        <div className="absolute bottom-4 left-4 text-white text-sm opacity-60 z-20">
          {displayItems.length} of {totalCount} items loaded
        </div>
      )}

      {/* Infinite Menu - always mounted, hidden when loading */}
      <div className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <InfiniteMenu 
          items={displayItems} 
          onActiveIndexChange={handleActiveIndexChange}
        />
      </div>
    </main>
  );
}