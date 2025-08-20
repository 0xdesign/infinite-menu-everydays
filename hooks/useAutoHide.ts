import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoHideOptions {
  delay?: number;
  enabled?: boolean;
  onHide?: () => void;
  onShow?: () => void;
}

export function useAutoHide({
  delay = 3000,
  enabled = true,
  onHide,
  onShow
}: UseAutoHideOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    clearHideTimeout();
    lastActivityRef.current = Date.now();
    
    if (!isVisible) {
      setIsVisible(true);
      onShow?.();
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, delay);
  }, [enabled, delay, isVisible, clearHideTimeout, onHide, onShow]);

  const show = useCallback(() => {
    setIsVisible(true);
    onShow?.();
    resetTimer();
  }, [resetTimer, onShow]);

  const hide = useCallback(() => {
    clearHideTimeout();
    setIsVisible(false);
    onHide?.();
  }, [clearHideTimeout, onHide]);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, hide, show]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const handleActivity = () => {
      resetTimer();
    };

    // Listen for user activity
    const events = ['mousemove', 'touchstart', 'touchmove', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timer
    resetTimer();

    return () => {
      clearHideTimeout();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer, clearHideTimeout]);

  return {
    isVisible,
    show,
    hide,
    toggle,
    resetTimer
  };
}