// ============================================
// Performance Monitor Overlay
// Shows real-time FPS and render metrics in development
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';

// Simple logger fallback
const logger = {
  warn: (component: string, message: string, data?: unknown) => {
    console.warn(`[${component}] ${message}`, data);
  },
};

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderCount: number;
  memory: number | null;
}

export function PerformanceMonitor() {
  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    renderCount: 0,
    memory: null,
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    frameCountRef.current++;
    
    // Update every second
    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      const frameTime = delta / frameCountRef.current;
      
      // Get memory usage if available
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ? Math.round((performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024)
        : null;
      
      setMetrics(prev => ({
        fps,
        frameTime: Math.round(frameTime * 100) / 100,
        renderCount: prev.renderCount + 1,
        memory,
      }));
      
      // Log warnings for poor performance
      if (fps < 30) {
        logger.warn('PerformanceMonitor', 'Low FPS detected', { fps, frameTime });
      }
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    rafRef.current = requestAnimationFrame(updateMetrics);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateMetrics);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateMetrics]);

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 z-[9999] font-mono text-xs transition-all duration-200 ${
        isExpanded ? 'bg-gray-900/95 p-4 rounded-lg shadow-2xl' : 'bg-gray-900/80 px-3 py-2 rounded'
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
      >
        <span className={`font-bold ${getFpsColor(metrics.fps)}`}>
          {metrics.fps} FPS
        </span>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-2 text-gray-300">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Frame Time:</span>
            <span className={metrics.frameTime > 33 ? 'text-red-400' : 'text-green-400'}>
              {metrics.frameTime.toFixed(2)} ms
            </span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Memory:</span>
            <span>
              {metrics.memory ? `${metrics.memory} MB` : 'N/A'}
            </span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Target:</span>
            <span className="text-green-400">60 FPS (16.67ms)</span>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                metrics.fps >= 55 ? 'bg-green-400' : 
                metrics.fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-400">
                {metrics.fps >= 55 ? 'Good' : metrics.fps >= 30 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
