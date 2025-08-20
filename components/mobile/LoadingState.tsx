'use client';

import { motion } from 'framer-motion';
import { Cube, Sparkle } from 'phosphor-react';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'minimal' | 'sphere';
}

export default function LoadingState({ 
  message = 'LOADING...', 
  variant = 'default' 
}: LoadingStateProps) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Cube className="w-5 h-5 text-white/60" weight="regular" />
          </motion.div>
          <span className="font-mono text-sm uppercase tracking-wider text-white/60">
            {message}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'sphere') {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="glass-subtle rounded-3xl p-8 flex flex-col items-center gap-4">
          <motion.div
            animate={{ 
              rotateX: 360,
              rotateY: 360
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            className="relative"
          >
            <div className="w-12 h-12 border-2 border-white/20 rounded-full" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-2 border border-white/40 rounded-full"
            />
          </motion.div>
          
          <div className="text-center space-y-2">
            <div className="font-mono text-lg uppercase tracking-wider text-white">
              INITIALIZING 3D
            </div>
            <div className="font-mono text-xs uppercase text-white/60">
              PREPARING SPHERE VISUALIZATION
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs">
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-2 border-white/10 rounded-full"
          />
          
          {/* Inner rotating elements */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 flex items-center justify-center"
          >
            <Sparkle className="w-6 h-6 text-white/60" weight="fill" />
          </motion.div>
          
          {/* Pulsing center */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-4 bg-white/20 rounded-full"
          />
        </div>
        
        <div className="text-center space-y-1">
          <motion.div 
            className="font-mono text-sm uppercase tracking-wider text-white"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {message}
          </motion.div>
          <div className="font-mono text-xs uppercase text-white/40">
            FETCHING NFT DATA
          </div>
        </div>
      </div>
    </div>
  );
}