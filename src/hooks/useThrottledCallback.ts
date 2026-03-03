// ============================================
// Hook: Throttled Callback
// Limits execution rate for high-frequency events (scroll, mousemove, etc.)
// ============================================

import { useRef, useCallback, useEffect } from 'react';

interface ThrottleOptions {
  leading?: boolean;  // Execute on first call
  trailing?: boolean; // Execute after throttle period
}

export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number,
  options: ThrottleOptions = {}
): T {
  const { leading = true, trailing = true } = options;
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallRef = useRef(0);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback reference up to date
  callbackRef.current = callback;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCallRef.current);
    
    lastArgsRef.current = args;
    
    // Execute immediately if leading and enough time has passed
    if (remaining <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      lastCallRef.current = now;
      
      if (leading) {
        callbackRef.current(...args);
      }
      
      // Set up trailing call if needed
      if (trailing && !leading) {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          timeoutRef.current = null;
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
        }, delay);
      }
      
      return;
    }
    
    // Schedule trailing execution
    if (trailing && !timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        timeoutRef.current = null;
        if (lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
        }
      }, remaining);
    }
  }, [delay, leading, trailing]) as T;
}

// ============================================
// Hook: RAF Throttled Callback
// Uses requestAnimationFrame for smooth UI updates
// ============================================

export function useRafThrottle<T extends (...args: Parameters<T>) => void>(
  callback: T
): T {
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  
  callbackRef.current = callback;
  
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    lastArgsRef.current = args;
    
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (lastArgsRef.current) {
        callbackRef.current(...lastArgsRef.current);
      }
    });
  }, []) as T;
}

// ============================================
// Hook: Debounced Callback
// Waits for pause in calls before executing
// ============================================

export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
}
