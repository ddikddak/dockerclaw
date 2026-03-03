// ============================================
// React DevTools Profiler Integration
// Tracks and logs slow renders in development
// ============================================

import { Profiler as ReactProfiler, type ReactNode, type ProfilerOnRenderCallback } from 'react';
import { logger } from '@/lib/logger';

interface ProfilerProps {
  children: ReactNode;
  id: string;
  threshold?: number; // ms threshold for warning
}

export function Profiler({ children, id, threshold = 16 }: ProfilerProps) {
  // Only enable in development
  if (!import.meta.env.DEV) {
    return children;
  }

  const handleRender: ProfilerOnRenderCallback = (
    profilerId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    // Log slow renders
    if (actualDuration > threshold) {
      logger.warn('Profiler', `Slow render detected: ${profilerId}`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        startTime,
        commitTime,
      });
    }

    // Always log in debug mode for very slow renders
    if (actualDuration > threshold * 2) {
      logger.error('Profiler', `Very slow render: ${profilerId}`, new Error('Render performance issue'), {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
      });
    }
  };

  return (
    <ReactProfiler id={id} onRender={handleRender}>
      {children}
    </ReactProfiler>
  );
}

// ============================================
// App-level Profiler Wrapper
// ============================================

interface AppProfilerProps {
  children: ReactNode;
}

export function AppProfiler({ children }: AppProfilerProps) {
  if (!import.meta.env.DEV) {
    return children;
  }

  const handleRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
    // Log only slow renders at app level
    if (actualDuration > 50) {
      logger.warn('AppProfiler', `App-level slow render: ${id}`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
      });
    }
  };

  return (
    <ReactProfiler id="App" onRender={handleRender}>
      {children}
    </ReactProfiler>
  );
}
