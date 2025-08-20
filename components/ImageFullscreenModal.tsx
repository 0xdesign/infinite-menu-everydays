'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'phosphor-react';
import { useEffect } from 'react';

interface MenuItem {
  id?: number;
  image: string;
  title: string;
  description: string;
}

interface ImageFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export default function ImageFullscreenModal({ isOpen, onClose, item }: ImageFullscreenModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-60 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-all duration-200 flex items-center justify-center group"
            aria-label="Close fullscreen image"
          >
            <X className="w-6 h-6 text-white/80 group-hover:text-white" />
          </button>

          {/* Image Container */}
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative max-w-5xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                loading="eager"
              />

              {/* Image Info Overlay */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-lg p-6"
              >
                <h2 className="font-mono text-white text-lg font-medium mb-2">
                  {item.title}
                </h2>
                <p className="font-mono text-white/70 text-sm leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <p className="font-mono text-xs text-white/40 uppercase tracking-wider">
              Press ESC or click anywhere to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}