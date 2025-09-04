'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { fetchInfiniteMenuData, fetchCategories } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import FilterSidebar from '@/components/FilterSidebar';
import MetadataPanel from '@/components/MetadataPanel';
import BottomControls from '@/components/BottomControls';
import ImageModal from '@/components/ImageModal';
import MobileHeader from '@/components/MobileHeader';
import BottomSheet from '@/components/BottomSheet';
import MobileFilterModal from '@/components/MobileFilterModal';
import MobileSearchModal from '@/components/MobileSearchModal';

const InfiniteMenu = dynamic(
  () => import('@/components/InfiniteMenu'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p className="font-mono text-xs uppercase tracking-[0.08em]">Loading...</p>
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
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowLoadingMessage, setShowSlowLoadingMessage] = useState(false);
  const [focusedItem, setFocusedItem] = useState<MenuItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setShowSlowLoadingMessage(false);
    
    const timeoutId = setTimeout(() => {
      fetchInfiniteMenuData(activeCategories, searchQuery)
        .then((data) => {
          setItems(data);
          setIsLoading(false);
          setShowSlowLoadingMessage(false);
        })
        .catch((error) => {
          console.error('Failed to fetch items:', error);
          setIsLoading(false);
          setShowSlowLoadingMessage(false);
        });
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeCategories, searchQuery]);

  // Show slow loading message after 2 seconds
  useEffect(() => {
    if (!isLoading) {
      setShowSlowLoadingMessage(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowLoadingMessage(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleCategoryToggle = useCallback((category: string) => {
    setActiveCategories((prev) => {
      const exists = prev.includes(category);
      if (exists) return prev.filter((c) => c !== category);
      return [...prev, category];
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // If clearing search, also clear submitted state
    if (!value) {
      setSubmittedQuery('');
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSubmittedQuery(searchQuery);
  }, [searchQuery]);

  const handleExpandClick = useCallback(() => {
    setIsImageModalOpen(true);
  }, []);

  const handleItemFocus = useCallback((item: MenuItem | null) => {
    setFocusedItem(item);
  }, []);

  // Map focused item for components
  const selectedItem = focusedItem ? {
    id: String(focusedItem.id ?? ''),
    title: focusedItem.title,
    description: focusedItem.description,
    category: focusedItem.categories,
    image_url: focusedItem.image,
    mint_url: focusedItem.mintUrl || undefined,
    collection_address: focusedItem.collectionAddress || undefined,
    token_id: String(focusedItem.id ?? ''),
    network: focusedItem.network || undefined,
    created_at: focusedItem.createdAt ?? undefined,
  } : null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Top Navigation */}
        <TopNav 
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {/* Main Content Area */}
        <div className="fixed top-16 left-0 right-0 bottom-0">
          {/* Filter Sidebar */}
          <FilterSidebar
            categories={categories}
            selectedCategories={activeCategories}
            onCategoryToggle={handleCategoryToggle}
          />

          {/* Center - 3D Menu */}
          <div className="fixed top-16 left-40 right-80 bottom-16">
            {!isLoading && items.length > 0 && (
              <InfiniteMenu 
                items={items} 
                initialFocusId={activeCategories.length === 0 && !searchQuery ? 755 : undefined}
                onItemFocus={handleItemFocus}
              />
            )}

            {!isLoading && items.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="font-mono text-white text-center">
                  <p className="text-sm uppercase tracking-[0.08em] mb-2">No items found</p>
                  <p className="text-xs text-white/60">
                    {searchQuery ? 'Try a different search term' : 'No items in this category'}
                  </p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="h-full flex items-center justify-center">
                <p className={`font-mono text-white text-xs ${
                  showSlowLoadingMessage 
                    ? 'normal-case tracking-normal' 
                    : 'uppercase tracking-[0.08em]'
                }`}>
                  {showSlowLoadingMessage 
                    ? 'almost done loading. sorry for the AI backend slop.'
                    : 'LOADING...'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <MetadataPanel selectedItem={selectedItem} />

          {/* Bottom Controls */}
          <BottomControls 
            itemCount={items.length}
            onExpandClick={handleExpandClick}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <MobileHeader
          onFilterClick={() => setIsMobileFilterOpen(true)}
          onSearchClick={() => setIsMobileSearchOpen(true)}
          activeFilterCount={activeCategories.length}
          hasSearchQuery={!!searchQuery}
        />

        {/* Mobile Main Content */}
        <div className="fixed top-16 left-0 right-0 bottom-0">
          {!isLoading && items.length > 0 && (
            <InfiniteMenu 
              items={items} 
              initialFocusId={activeCategories.length === 0 && !searchQuery ? 755 : undefined}
              onItemFocus={handleItemFocus}
            />
          )}

          {!isLoading && items.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="font-mono text-white text-center px-4">
                <p className="text-sm uppercase tracking-[0.08em] mb-2">No items found</p>
                <p className="text-xs text-white/60">
                  {searchQuery ? 'Try a different search term' : 'No items in this category'}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <p className={`font-mono text-white text-xs ${
                showSlowLoadingMessage 
                  ? 'normal-case tracking-normal' 
                  : 'uppercase tracking-[0.08em]'
              }`}>
                {showSlowLoadingMessage 
                  ? 'almost done loading. sorry for the backend AI slop.'
                  : 'LOADING...'
                }
              </p>
            </div>
          )}

          {/* Mobile Expand Button - Overlay on sphere */}
          {focusedItem && (
            <button
              onClick={handleExpandClick}
              className="fixed bottom-24 right-4 w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center z-40"
              aria-label="Expand image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" className="text-white" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Bottom Sheet */}
        <BottomSheet 
          selectedItem={selectedItem}
          onExpandImage={handleExpandClick}
        />

        {/* Mobile Filter Modal */}
        <MobileFilterModal
          isOpen={isMobileFilterOpen}
          categories={categories}
          selectedCategories={activeCategories}
          onCategoryToggle={handleCategoryToggle}
          onClose={() => setIsMobileFilterOpen(false)}
        />

        {/* Mobile Search Modal */}
        <MobileSearchModal
          isOpen={isMobileSearchOpen}
          searchQuery={searchQuery}
          submittedQuery={submittedQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onClose={() => setIsMobileSearchOpen(false)}
        />
      </div>

      {/* Image Modal - Shared between desktop and mobile */}
      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={focusedItem?.image}
        title={focusedItem?.title}
        onClose={() => setIsImageModalOpen(false)}
      />
    </main>
  );
}