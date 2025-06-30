import { useState, useEffect, useCallback, useRef } from 'react';

interface MenuItem {
  id: number;
  image: string;
  link: string;
  title: string;
  description: string;
}

interface PaginationState {
  items: MenuItem[];
  currentOffset: number;
  totalCount: number;
  isLoading: boolean;
  hasMore: boolean;
}

interface UsePaginatedItemsOptions {
  windowSize?: number;
  prefetchThreshold?: number;
  onFetch: (offset: number, limit: number) => Promise<{ items: MenuItem[], total: number }>;
}

export function usePaginatedItems(
  allItems: MenuItem[],
  options: UsePaginatedItemsOptions
) {
  const {
    windowSize = 200,
    prefetchThreshold = 50,
    onFetch
  } = options;

  const [state, setState] = useState<PaginationState>({
    items: [],
    currentOffset: 0,
    totalCount: 0,
    isLoading: false,
    hasMore: true
  });

  const fetchingRef = useRef(false);
  const lastActiveIndexRef = useRef(0);

  // Initialize with first window
  useEffect(() => {
    if (allItems.length > 0 && allItems.length <= windowSize) {
      // If all items fit in one window, use them directly
      setState({
        items: allItems,
        currentOffset: 0,
        totalCount: allItems.length,
        isLoading: false,
        hasMore: false
      });
    } else if (allItems.length > windowSize) {
      // For large datasets, start with first window
      setState({
        items: allItems.slice(0, windowSize),
        currentOffset: 0,
        totalCount: allItems.length,
        isLoading: false,
        hasMore: true
      });
    }
  }, [allItems, windowSize]);

  const loadWindow = useCallback(async (offset: number) => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { items, total } = await onFetch(offset, windowSize);
      
      setState({
        items,
        currentOffset: offset,
        totalCount: total,
        isLoading: false,
        hasMore: offset + items.length < total
      });
    } catch (error) {
      console.error('Failed to load items window:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    } finally {
      fetchingRef.current = false;
    }
  }, [onFetch, windowSize]);

  const checkAndLoadAdjacent = useCallback((activeIndex: number) => {
    // Map the cycled index to actual item index
    const actualIndex = activeIndex % state.items.length;
    const globalIndex = state.currentOffset + actualIndex;
    
    lastActiveIndexRef.current = globalIndex;

    // Check if we're near the edge of current window
    const distanceToEnd = state.items.length - actualIndex;
    const distanceToStart = actualIndex;

    // Prefetch next window if approaching end
    if (distanceToEnd < prefetchThreshold && state.hasMore) {
      const nextOffset = state.currentOffset + windowSize;
      if (nextOffset < state.totalCount) {
        loadWindow(nextOffset);
      }
    }

    // Prefetch previous window if approaching start
    if (distanceToStart < prefetchThreshold && state.currentOffset > 0) {
      const prevOffset = Math.max(0, state.currentOffset - windowSize);
      loadWindow(prevOffset);
    }
  }, [state, prefetchThreshold, windowSize, loadWindow]);

  return {
    items: state.items,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    hasMore: state.hasMore,
    currentOffset: state.currentOffset,
    checkAndLoadAdjacent
  };
}