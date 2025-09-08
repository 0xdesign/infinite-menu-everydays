'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FocusedMediaPlayerProps {
  mediaUrl?: string | null;
  posterUrl?: string;
  isActive: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
}

export default function FocusedMediaPlayer({
  mediaUrl,
  posterUrl,
  isActive,
  onLoadStart,
  onLoadComplete
}: FocusedMediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Load and play video
  useEffect(() => {
    if (!isActive || !mediaUrl) {
      cleanup();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Check if this is a video file (mp4, webm) or needs special handling
    const isVideo = /\.(mp4|webm|mov)$/i.test(mediaUrl);
    
    if (isVideo) {
      setIsLoading(true);
      setHasError(false);
      onLoadStart?.();

      video.src = mediaUrl;
      video.load();
      
      const handleCanPlay = () => {
        setIsLoading(false);
        video.play().catch(err => {
          console.warn('Autoplay failed:', err);
          setHasError(true);
        });
        onLoadComplete?.();
      };

      const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        onLoadComplete?.();
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        cleanup();
      };
    }
  }, [isActive, mediaUrl, cleanup, onLoadStart, onLoadComplete]);

  // Preload next item (currently unused but can be used for future optimization)
  // const preloadMedia = useCallback((url: string) => {
  //   if (!url || !/\.(mp4|webm|mov)$/i.test(url)) return;
  //   
  //   // Create hidden video element for preloading
  //   if (!preloadRef.current) {
  //     preloadRef.current = document.createElement('video');
  //     preloadRef.current.muted = true;
  //     preloadRef.current.playsInline = true;
  //     preloadRef.current.preload = 'auto';
  //   }
  //   
  //   preloadRef.current.src = url;
  //   preloadRef.current.load();
  // }, []);

  if (!isActive || !mediaUrl || hasError) {
    return null;
  }

  const isVideo = /\.(mp4|webm|mov)$/i.test(mediaUrl);
  const isGif = /\.gif$/i.test(mediaUrl);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center"
      style={{ 
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      {isVideo && (
        <video
          ref={videoRef}
          className="absolute"
          style={{
            width: '30%',
            height: '30%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.8))'
          }}
          autoPlay
          loop
          muted
          playsInline
          poster={posterUrl}
        />
      )}
      
      {isGif && !isVideo && (
        <img
          src={mediaUrl}
          alt=""
          className="absolute"
          style={{
            width: '30%',
            height: '30%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.8))'
          }}
          onLoad={() => {
            setIsLoading(false);
            onLoadComplete?.();
          }}
          onError={() => {
            setHasError(true);
            onLoadComplete?.();
          }}
        />
      )}
    </div>
  );
}

// Companion hook for managing multiple media items with preloading
export function useMediaPreloader(items: Array<{ id: string; mediaUrl?: string }>, focusedIndex: number) {
  const [loadedMedia, setLoadedMedia] = useState<Set<string>>(new Set());
  const preloadRadius = 1; // Preload 1 item in each direction

  useEffect(() => {
    const toPreload: string[] = [];
    
    // Determine which items to preload based on focus
    for (let i = -preloadRadius; i <= preloadRadius; i++) {
      const index = focusedIndex + i;
      if (index >= 0 && index < items.length) {
        const mediaUrl = items[index]?.mediaUrl;
        if (mediaUrl && !loadedMedia.has(mediaUrl)) {
          toPreload.push(mediaUrl);
        }
      }
    }

    // Preload media files
    toPreload.forEach(url => {
      if (/\.(mp4|webm|mov)$/i.test(url)) {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'metadata';
        video.load();
        
        video.onloadedmetadata = () => {
          setLoadedMedia(prev => new Set(prev).add(url));
        };
      } else if (/\.gif$/i.test(url)) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setLoadedMedia(prev => new Set(prev).add(url));
        };
      }
    });

    // Cleanup media that's too far from focus
    setLoadedMedia(prev => {
      const newSet = new Set<string>();
      for (let i = -preloadRadius - 1; i <= preloadRadius + 1; i++) {
        const index = focusedIndex + i;
        if (index >= 0 && index < items.length) {
          const mediaUrl = items[index]?.mediaUrl;
          if (mediaUrl && prev.has(mediaUrl)) {
            newSet.add(mediaUrl);
          }
        }
      }
      return newSet;
    });
  }, [focusedIndex, items, loadedMedia, preloadRadius]);

  return loadedMedia;
}