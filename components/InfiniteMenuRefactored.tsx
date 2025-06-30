'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebGLRenderer } from '@/lib/infinitemenu/renderers/WebGLRenderer';
import { Canvas2DRenderer } from '@/lib/infinitemenu/renderers/Canvas2DRenderer';
import { MenuItem, Renderer } from '@/lib/infinitemenu/types';

interface InfiniteMenuProps {
  items: MenuItem[];
  onActiveIndexChange?: (index: number) => void;
  onError?: (error: Error) => void;
  forceCanvas2D?: boolean; // For testing fallback
}

// Error boundary component
class InfiniteMenuErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('InfiniteMenu error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-8">
            <h2 className="text-xl mb-4">Unable to load 3D menu</h2>
            <p className="text-sm opacity-70">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function InfiniteMenuInner({ items, onActiveIndexChange, onError, forceCanvas2D }: InfiniteMenuProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Handle errors
  const handleError = useCallback((err: Error) => {
    console.error('InfiniteMenu error:', err);
    setError(err);
    onError?.(err);
  }, [onError]);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;

    const initRenderer = async () => {
      try {
        let renderer: Renderer;
        let usingFallback = false;
        
        // Try WebGL first (unless forced to use Canvas2D)
        if (!forceCanvas2D) {
          const webglRenderer = new WebGLRenderer({
            canvas,
            items,
            onActiveItemChange: onActiveIndexChange,
            onError: handleError
          });

          if (webglRenderer.isSupported) {
            try {
              await webglRenderer.initialize();
              renderer = webglRenderer;
            } catch (webglError) {
              console.warn('WebGL initialization failed, falling back to Canvas2D:', webglError);
              usingFallback = true;
            }
          } else {
            console.warn('WebGL2 not supported, falling back to Canvas2D');
            usingFallback = true;
          }
        } else {
          usingFallback = true;
        }
        
        // Fall back to Canvas2D if needed
        if (usingFallback || forceCanvas2D) {
          const canvas2dRenderer = new Canvas2DRenderer({
            canvas,
            items,
            onActiveItemChange: onActiveIndexChange,
            onError: handleError
          });
          
          if (!canvas2dRenderer.isSupported) {
            throw new Error('Neither WebGL2 nor Canvas2D is supported');
          }
          
          await canvas2dRenderer.initialize();
          renderer = canvas2dRenderer;
          setIsUsingFallback(true);
        }
        
        rendererRef.current = renderer!;
        setIsInitialized(true);

        // Initial resize
        renderer!.resize();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    initRenderer();

    // Cleanup
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
        setIsInitialized(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update items
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;
    
    rendererRef.current.updateItems(items);
  }, [items, isInitialized]);

  // Handle resize
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    const handleResize = () => {
      rendererRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    
    // Also observe canvas size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [isInitialized]);

  // Handle animation loop
  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    let animationId: number;
    const animate = (time: number) => {
      if (rendererRef.current) {
        rendererRef.current.render(time);
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isInitialized]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-xl mb-4">Unable to initialize 3D menu</h2>
          <p className="text-sm opacity-70">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white">Initializing 3D menu...</div>
        </div>
      )}
      {isInitialized && isUsingFallback && (
        <div className="absolute top-4 right-4 text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
          Canvas2D Mode
        </div>
      )}
    </div>
  );
}

export default function InfiniteMenuRefactored(props: InfiniteMenuProps) {
  return (
    <InfiniteMenuErrorBoundary onError={props.onError}>
      <InfiniteMenuInner {...props} />
    </InfiniteMenuErrorBoundary>
  );
}