import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JumpControlsProps {
  onJump: (direction: 'forward' | 'backward') => void;
  isMoving: boolean;
  className?: string;
}

export const JumpControls = ({ onJump, isMoving, className = '' }: JumpControlsProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  
  // Show controls on hover/tap
  useEffect(() => {
    const handleMouseMove = () => {
      setIsVisible(true);
      setLastInteraction(Date.now());
    };
    
    const handleTouch = () => {
      setIsVisible(true);
      setLastInteraction(Date.now());
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);
  
  // Hide controls after inactivity on mobile
  useEffect(() => {
    const isMobile = 'ontouchstart' in window;
    if (!isMobile || isHovered) return;
    
    const timeout = setTimeout(() => {
      if (Date.now() - lastInteraction > 3000) {
        setIsVisible(false);
      }
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [lastInteraction, isHovered]);
  
  const handleJump = (direction: 'forward' | 'backward') => {
    onJump(direction);
    setLastInteraction(Date.now());
  };
  
  return (
    <AnimatePresence>
      {isVisible && !isMoving && (
        <motion.div
          className={`fixed inset-x-0 bottom-0 flex justify-between items-center px-8 pb-24 pointer-events-none ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.button
            className="group relative w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-all hover:bg-white/20 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={() => handleJump('backward')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Previous batch"
            role="button"
          >
            <svg
              className="w-8 h-8 text-white/80 group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Prev Batch
            </span>
          </motion.button>
          
          <motion.button
            className="group relative w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-all hover:bg-white/20 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={() => handleJump('forward')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Next batch"
            role="button"
          >
            <svg
              className="w-8 h-8 text-white/80 group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Next Batch
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};