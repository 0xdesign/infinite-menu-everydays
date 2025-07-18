import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  viewed: number;
  total: number;
  className?: string;
}

export const ProgressRing = ({ viewed, total, className = '' }: ProgressRingProps) => {
  const [displayedViewed, setDisplayedViewed] = useState(viewed);
  const percentage = total > 0 ? (displayedViewed / total) * 100 : 0;
  const radius = 20;
  const strokeWidth = 3;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Animate number changes
  useEffect(() => {
    if (displayedViewed === viewed) return;
    
    const diff = viewed - displayedViewed;
    const duration = 500; // ms
    const steps = 20;
    const increment = diff / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayedViewed(viewed);
        clearInterval(interval);
      } else {
        setDisplayedViewed(prev => Math.round(prev + increment));
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [viewed, displayedViewed]);
  
  return (
    <motion.div
      className={`fixed top-8 right-8 flex items-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="rgba(255, 255, 255, 0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke="rgba(0, 255, 255, 0.8)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div className="text-sm text-white/80">
        <motion.div
          className="font-mono"
          key={displayedViewed}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {displayedViewed}/{total}
        </motion.div>
        <div className="text-xs text-white/60">viewed</div>
      </div>
    </motion.div>
  );
};