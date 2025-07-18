import { useState, useRef, useCallback, useEffect } from 'react';
import { vec3 } from 'gl-matrix';

interface RecyclingConfig {
  instanceCount: number;
  totalItems: number;
  startOffset?: number;
  sphereRadius: number;
}

interface RecyclingState {
  logicalIds: number[];
  nextGlobalId: number;
  viewedItems: Set<number>;
}

export const useInfiniteWindow = (config: RecyclingConfig) => {
  const { instanceCount, totalItems, startOffset, sphereRadius } = config;
  
  // Initialize start offset - random or from session storage
  const initStartOffset = useCallback(() => {
    if (startOffset !== undefined) return startOffset;
    
    // Check session storage first
    const stored = sessionStorage.getItem('infiniteMenu_startOffset');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < totalItems) {
        return parsed;
      }
    }
    
    // Generate random offset
    const randomOffset = Math.floor(Math.random() * totalItems);
    sessionStorage.setItem('infiniteMenu_startOffset', randomOffset.toString());
    return randomOffset;
  }, [startOffset, totalItems]);
  
  const [state, setState] = useState<RecyclingState>(() => {
    const offset = initStartOffset();
    const logicalIds = new Array(instanceCount);
    
    // Initialize logical IDs with offset
    for (let i = 0; i < instanceCount; i++) {
      logicalIds[i] = (offset + i) % totalItems;
    }
    
    // Track viewed items
    const viewedItems = new Set<number>();
    logicalIds.forEach(id => viewedItems.add(id));
    
    return {
      logicalIds,
      nextGlobalId: offset + instanceCount,
      viewedItems
    };
  });
  
  // Check if an instance is behind the sphere
  const isBehindSphere = useCallback((worldZ: number): boolean => {
    return worldZ < -sphereRadius * 0.2;
  }, [sphereRadius]);
  
  // Reuse a slot for the next unseen item
  const reuseSlot = useCallback((instanceIndex: number): number => {
    setState(prev => {
      const newState = { ...prev };
      const newLogicalId = prev.nextGlobalId % totalItems;
      
      newState.logicalIds = [...prev.logicalIds];
      newState.logicalIds[instanceIndex] = newLogicalId;
      newState.nextGlobalId = prev.nextGlobalId + 1;
      
      // Track as viewed
      newState.viewedItems = new Set(prev.viewedItems);
      newState.viewedItems.add(newLogicalId);
      
      return newState;
    });
    
    return state.logicalIds[instanceIndex];
  }, [totalItems, state.logicalIds]);
  
  // Process all instances to check for recycling
  const processInstances = useCallback((instancePositions: vec3[]): number[] => {
    const recycledInstances: number[] = [];
    
    instancePositions.forEach((pos, index) => {
      if (isBehindSphere(pos[2])) {
        reuseSlot(index);
        recycledInstances.push(index);
      }
    });
    
    return recycledInstances;
  }, [isBehindSphere, reuseSlot]);
  
  // Get the logical item ID for a given instance
  const getLogicalId = useCallback((instanceIndex: number): number => {
    return state.logicalIds[instanceIndex] || 0;
  }, [state.logicalIds]);
  
  // Jump forward or backward by instanceCount items
  const jump = useCallback((direction: 'forward' | 'backward') => {
    setState(prev => {
      const jumpAmount = direction === 'forward' ? instanceCount : -instanceCount;
      const newStartId = (prev.logicalIds[0] + jumpAmount + totalItems) % totalItems;
      
      const newLogicalIds = new Array(instanceCount);
      const newViewedItems = new Set(prev.viewedItems);
      
      for (let i = 0; i < instanceCount; i++) {
        const id = (newStartId + i) % totalItems;
        newLogicalIds[i] = id;
        newViewedItems.add(id);
      }
      
      return {
        logicalIds: newLogicalIds,
        nextGlobalId: newStartId + instanceCount,
        viewedItems: newViewedItems
      };
    });
  }, [instanceCount, totalItems]);
  
  // Get progress information
  const getProgress = useCallback(() => {
    return {
      viewed: state.viewedItems.size,
      total: totalItems,
      percentage: (state.viewedItems.size / totalItems) * 100
    };
  }, [state.viewedItems.size, totalItems]);
  
  // Reset viewed items (useful for testing)
  const resetProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewedItems: new Set(prev.logicalIds)
    }));
    sessionStorage.removeItem('infiniteMenu_viewedItems');
  }, []);
  
  // Persist viewed items to session storage
  useEffect(() => {
    const viewedArray = Array.from(state.viewedItems);
    sessionStorage.setItem('infiniteMenu_viewedItems', JSON.stringify(viewedArray));
  }, [state.viewedItems]);
  
  // Load viewed items from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('infiniteMenu_viewedItems');
    if (stored) {
      try {
        const viewedArray = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          viewedItems: new Set([...prev.viewedItems, ...viewedArray])
        }));
      } catch (e) {
        console.error('Failed to load viewed items from session storage:', e);
      }
    }
  }, []);
  
  return {
    logicalIds: state.logicalIds,
    getLogicalId,
    processInstances,
    reuseSlot,
    jump,
    getProgress,
    resetProgress,
    viewedItemsCount: state.viewedItems.size
  };
};