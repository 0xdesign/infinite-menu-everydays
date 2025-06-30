'use client';

import { useState } from 'react';
import InfiniteMenuRefactored from '@/components/InfiniteMenuRefactored';
import { MenuItem } from '@/lib/infinitemenu/types';

// Generate demo items
function generateDemoItems(count: number): MenuItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    image: `https://picsum.photos/seed/${i + 1}/400/400`,
    imageHighRes: `https://picsum.photos/seed/${i + 1}/800/800`,
    link: `#item-${i + 1}`,
    title: `Item ${i + 1}`,
    description: `This is demo item number ${i + 1}`
  }));
}

export default function DemoPage() {
  const [itemCount, setItemCount] = useState(42);
  const [activeIndex, setActiveIndex] = useState(0);
  const [forceCanvas2D, setForceCanvas2D] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const items = generateDemoItems(itemCount);

  return (
    <div className="w-screen h-screen flex flex-col bg-black">
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-black/50 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <label htmlFor="itemCount">Items:</label>
            <input
              id="itemCount"
              type="range"
              min="3"
              max="200"
              value={itemCount}
              onChange={(e) => setItemCount(Number(e.target.value))}
              className="w-32"
            />
            <span className="w-12 text-right">{itemCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="forceCanvas2D"
              type="checkbox"
              checked={forceCanvas2D}
              onChange={(e) => setForceCanvas2D(e.target.checked)}
              className="mr-1"
            />
            <label htmlFor="forceCanvas2D">Force Canvas2D</label>
          </div>

          <div className="flex-1 text-center">
            Active: {items[activeIndex]?.title || 'None'}
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              Error: {error.message}
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1">
        <InfiniteMenuRefactored
          items={items}
          onActiveIndexChange={setActiveIndex}
          onError={setError}
          forceCanvas2D={forceCanvas2D}
        />
      </div>

      {/* Info */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>Drag to rotate • {itemCount > 42 ? 'Temporal cycling enabled' : 'Static mapping'}</p>
      </div>
    </div>
  );
}