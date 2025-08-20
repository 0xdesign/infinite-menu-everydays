'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl?: string;
  title?: string;
  onClose: () => void;
}

export default function ImageModal({ isOpen, imageUrl, title, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-8"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
        aria-label="Close modal"
      >
        <X size={24} />
      </button>

      {/* Image Container */}
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || 'Expanded view'}
            className="max-w-full max-h-[90vh] object-contain"
          />
        ) : (
          <div className="w-96 h-96 bg-white/10 rounded-lg flex items-center justify-center">
            <span className="font-mono text-white/40 text-sm uppercase tracking-[0.08em]">
              No image available
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      {title && (
        <div className="absolute bottom-8 left-8 right-8 text-center">
          <h3 className="font-mono text-white text-sm uppercase tracking-[0.08em]">
            {title}
          </h3>
        </div>
      )}
    </div>
  );
}