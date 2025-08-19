'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Warning, X, Info } from 'phosphor-react';
import { useEffect } from 'react';

interface ToastProps {
  isVisible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export default function Toast({ 
  isVisible, 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose,
  position = 'top'
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-400" weight="bold" />;
      case 'error':
        return <X className="w-5 h-5 text-red-400" weight="bold" />;
      case 'warning':
        return <Warning className="w-5 h-5 text-yellow-400" weight="bold" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" weight="bold" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'border-green-400/30 bg-green-400/10';
      case 'error':
        return 'border-red-400/30 bg-red-400/10';
      case 'warning':
        return 'border-yellow-400/30 bg-yellow-400/10';
      default:
        return 'border-blue-400/30 bg-blue-400/10';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0, 
            y: position === 'top' ? -100 : 100,
            scale: 0.8
          }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: 1
          }}
          exit={{ 
            opacity: 0, 
            y: position === 'top' ? -100 : 100,
            scale: 0.8
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300
          }}
          className={`fixed ${
            position === 'top' ? 'top-6' : 'bottom-6'
          } left-4 right-4 z-50 max-w-sm mx-auto`}
        >
          <div className={`
            glass-subtle rounded-2xl p-4 border ${getColors()}
            shadow-2xl backdrop-blur-xl
          `}>
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>
              
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-white leading-relaxed">
                  {message}
                </p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors duration-150"
              >
                <X className="w-4 h-4 text-white/60" weight="bold" />
              </button>
            </div>
            
            {/* Progress Bar */}
            {duration > 0 && (
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-b-2xl"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}