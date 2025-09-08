'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { StaticNFTData } from '@/lib/staticTypes';
import { mapNFTToMenuItem } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import FilterSidebar from '@/components/FilterSidebar';
import MetadataPanel from '@/components/MetadataPanel';
import BottomControls from '@/components/BottomControls';
import ImageModal from '@/components/ImageModal';
import MobileHeader from '@/components/MobileHeader';
import BottomSheet from '@/components/BottomSheet';
import MobileFilterModal from '@/components/MobileFilterModal';
import MobileSearchModal from '@/components/MobileSearchModal';
import FocusedMediaPlayer from '@/components/FocusedMediaPlayer';

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
  mediaUrl?: string | null;
  mimeType?: string | null;
}

interface GalleryClientProps {
  initialData: StaticNFTData;
}

export default function GalleryClient({ initialData }: GalleryClientProps) {
  const [allItems] = useState<MenuItem[]>(() => 
    initialData.items.map(mapNFTToMenuItem)
  );
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>(allItems);
  const [categories] = useState<string[]>(initialData.categories);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [focusedItem, setFocusedItem] = useState<MenuItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Filter items based on categories and search
  useEffect(() => {
    let filtered = allItems;
    
    // Apply category filter
    if (activeCategory) {
      filtered = filtered.filter(item => 
        item.categories?.includes(activeCategory)
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredItems(filtered);
  }, [allItems, activeCategory, searchQuery]);

  const handleCategoryToggle = useCallback((category: string) => {
    setActiveCategory((prev) => {
      // If clicking the same category, deselect it (go back to all)
      if (prev === category) return null;
      // Otherwise select the new category
      return category;
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
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
      {/* Media Player Overlay */}
      <FocusedMediaPlayer
        mediaUrl={focusedItem?.mediaUrl}
        posterUrl={focusedItem?.image}
        isActive={!!focusedItem && !!focusedItem.mediaUrl}
      />
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
            selectedCategory={activeCategory}
            onCategoryToggle={handleCategoryToggle}
          />

          {/* Center - 3D Menu */}
          <div className="fixed top-16 left-40 right-80 bottom-16">
            {filteredItems.length > 0 && (
              <InfiniteMenu 
                items={filteredItems} 
                initialFocusId={!activeCategory && !searchQuery ? 755 : undefined}
                onItemFocus={handleItemFocus}
                category={activeCategory || 'all'}
              />
            )}

            {filteredItems.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="font-mono text-white text-center">
                  <p className="text-sm uppercase tracking-[0.08em] mb-2">No items found</p>
                  <p className="text-xs text-white/60">
                    {searchQuery ? 'Try a different search term' : 'No items in this category'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <MetadataPanel selectedItem={selectedItem} />

          {/* Bottom Controls */}
          <BottomControls 
            itemCount={filteredItems.length}
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
          activeFilterCount={activeCategory ? 1 : 0}
          hasSearchQuery={!!searchQuery}
        />

        {/* Mobile Main Content */}
        <div className="fixed top-16 left-0 right-0 bottom-0">
          {filteredItems.length > 0 && (
            <InfiniteMenu 
              items={filteredItems} 
              initialFocusId={!activeCategory && !searchQuery ? 755 : undefined}
              onItemFocus={handleItemFocus}
              category={activeCategory || 'all'}
            />
          )}

          {filteredItems.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="font-mono text-white text-center px-4">
                <p className="text-sm uppercase tracking-[0.08em] mb-2">No items found</p>
                <p className="text-xs text-white/60">
                  {searchQuery ? 'Try a different search term' : 'No items in this category'}
                </p>
              </div>
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
          selectedCategory={activeCategory}
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