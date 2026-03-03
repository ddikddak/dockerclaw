// ============================================
// Hook: Performance Monitor
// Development-only render counting and timing
// ============================================

import { useRef, useEffect } from 'react';

const isDev = import.meta.env.DEV;

export function useRenderCount(componentName: string): number {
  const countRef = useRef(0);
  
  if (isDev) {
    countRef.current++;
    
    useEffect(() => {
      console.log(`[RenderCount] ${componentName}: #${countRef.current}`);
    });
  }
  
  return countRef.current;
}

export function useRenderTime(componentName: string, threshold: number = 16): void {
  if (!isDev) return;
  
  const startTime = performance.now();
  
  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > threshold) {
      console.warn(
        `[RenderTime] ${componentName} took ${duration.toFixed(2)}ms (> ${threshold}ms)`,
        { duration, threshold }
      );
    }
  });
}

export function useWhyDidYouUpdate(
  componentName: string,
  props: Record<string, unknown>
): void {
  if (!isDev) return;
  
  const prevPropsRef = useRef(props);
  
  useEffect(() => {
    const prevProps = prevPropsRef.current;
    const changedProps: Record<string, { from: unknown; to: unknown }> = {};
    
    Object.keys(props).forEach((key) => {
      if (prevProps[key] !== props[key]) {
        changedProps[key] = {
          from: prevProps[key],
          to: props[key],
        };
      }
    });
    
    if (Object.keys(changedProps).length > 0) {
      console.log(`[WhyDidYouUpdate] ${componentName}:`, changedProps);
    }
    
    prevPropsRef.current = props;
  });
}

// ============================================
// Logger for production performance tracking
// ============================================

interface PerformanceEntry {
  component: string;
  duration: number;
  timestamp: number;
}

class PerformanceLogger {
  private logs: PerformanceEntry[] = [];
  private maxLogs = 100;
  
  log(component: string, duration: number): void {
    this.logs.push({
      component,
      duration,
      timestamp: Date.now(),
    });
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
  
  getSlowRenders(threshold: number = 16): PerformanceEntry[] {
    return this.logs.filter((entry) => entry.duration > threshold);
  }
  
  getAverage(component: string): number {
    const componentLogs = this.logs.filter((log) => log.component === component);
    if (componentLogs.length === 0) return 0;
    
    const sum = componentLogs.reduce((acc, log) => acc + log.duration, 0);
    return sum / componentLogs.length;
  }
  
  clear(): void {
    this.logs = [];
  }
}

export const performanceLogger = new PerformanceLogger();
