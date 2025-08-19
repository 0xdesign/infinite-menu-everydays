'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'phosphor-react';

interface UltraMinimalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
}

export default function UltraMinimalSearch({
  isOpen,
  onClose,
  value,
  onChange
}: UltraMinimalSearchProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
        >
          <div className="flex items-center h-12 px-4 border-b border-white/10">
            <input
              type="search"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="SEARCH"
              className="flex-1 bg-transparent text-sm font-mono uppercase text-white placeholder-white/30 focus:outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-2 -mr-2"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}