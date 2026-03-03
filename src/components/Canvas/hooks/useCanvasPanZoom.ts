// ============================================
// Hook: Canvas Pan and Zoom
// Manages viewport transformation state
// ============================================

import { useState, useCallback, useRef } from 'react';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const DEFAULT_ZOOM = 1;

interface PanState {
  x: number;
  y: number;
}

interface UseCanvasPanZoomOptions {
  initialZoom?: number;
  initialPan?: PanState;
}

export interface UseCanvasPanZoomReturn {
  zoom: number;
  pan: PanState;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: PanState | ((prev: PanState) => PanState)) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
  zoomToFit: (bbox: { x: number; y: number; w: number; h: number }, padding?: number) => void;
}

export function useCanvasPanZoom(options: UseCanvasPanZoomOptions = {}): UseCanvasPanZoomReturn {
  const { initialZoom = DEFAULT_ZOOM, initialPan = { x: 0, y: 0 } } = options;
  
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<PanState>(initialPan);
  const containerRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + pan.x,
      y: canvasY * zoom + pan.y,
    };
  }, [pan, zoom]);

  const zoomToFit = useCallback((
    bbox: { x: number; y: number; w: number; h: number },
    padding: number = 1.3
  ) => {
    const containerWidth = containerRef.current.width;
    const containerHeight = containerRef.current.height;
    
    if (containerWidth === 0 || containerHeight === 0) return;

    const zoomToFit = Math.min(
      containerWidth / (bbox.w * padding),
      containerHeight / (bbox.h * padding)
    );
    const targetZoom = Math.max(MIN_ZOOM, Math.min(zoomToFit, 1.5));
    
    const newPanX = containerWidth / 2 - (bbox.x + bbox.w / 2) * targetZoom;
    const newPanY = containerHeight / 2 - (bbox.y + bbox.h / 2) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  return {
    zoom,
    pan,
    setZoom,
    setPan,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    screenToCanvas,
    canvasToScreen,
    zoomToFit,
  };
}
