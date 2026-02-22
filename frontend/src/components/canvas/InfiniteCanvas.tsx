'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCanvasStore } from '@/lib/store'
import { CardLayer } from './CardLayer'

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { zoom, pan, setZoom, setPan, setIsDragging } = useCanvasStore()

  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  // Pan amb middle mouse o space+drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button (button 1) or space+left click on canvas background
      const isCanvasBackground = (e.target as HTMLElement).dataset.canvas === 'true'
      
      if (e.button === 1 || (isSpacePressed && e.button === 0 && isCanvasBackground)) {
        e.preventDefault()
        setIsPanning(true)
        setIsDragging(true)
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
      }
    },
    [isSpacePressed, pan, setIsDragging]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        })
      }
    },
    [isPanning, setPan]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setIsDragging(false)
  }, [setIsDragging])

  // Zoom amb Ctrl+scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      } else if (!e.shiftKey) {
        // Scroll normal per moure'ns pel canvas (pan)
        setPan({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY,
        })
      }
    },
    [zoom, pan, setZoom, setPan]
  )

  // Space key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && e.target && !(e.target as Element).closest('input, textarea')) {
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleZoomIn = () => setZoom(zoom + 0.1)
  const handleZoomOut = () => setZoom(zoom - 0.1)
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{
        backgroundColor: '#f5f5f5',
        backgroundImage: `radial-gradient(circle, #e0e0e0 1px, transparent 1px)`,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      data-canvas="true"
    >
      {/* Transform layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
        data-canvas="true"
      >
        <CardLayer />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg border p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          title="Zoom In (Ctrl + Scroll)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="text-center text-xs text-gray-500 py-1">{Math.round(zoom * 100)}%</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          title="Zoom Out (Ctrl + Scroll)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="h-px bg-gray-200 my-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleReset}
          title="Reset View"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white/80 px-3 py-2 rounded-lg backdrop-blur-sm">
        <p>🖱️ Middle click + drag to pan</p>
        <p>⌨️ Space + drag to pan</p>
        <p>🔍 Ctrl + scroll to zoom</p>
      </div>
    </div>
  )
}
