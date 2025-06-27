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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch categories on mount
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    // Fetch items when category changes
    setIsLoading(true);
    fetchInfiniteMenuData(activeCategory)
      .then((data) => {
        console.log('Fetched items:', data.length, 'items for category:', activeCategory || 'All');
        setItems(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch items:', error);
        setIsLoading(false);
      });
  }, [activeCategory]);

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
    </main>
  );
}