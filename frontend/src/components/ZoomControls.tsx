'use client'

import { Button } from '@/components/ui/button'
import { useCanvasStore } from '@/lib/store'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export function ZoomControls() {
  const { zoom, zoomIn, zoomOut, resetZoom } = useCanvasStore()

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-lg border p-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomOut}
        className="h-8 w-8"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <div className="px-2 min-w-[60px] text-center text-sm font-medium tabular-nums">
        {Math.round(zoom * 100)}%
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomIn}
        className="h-8 w-8"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={resetZoom}
        className="h-8 w-8"
        title="Reset zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}
