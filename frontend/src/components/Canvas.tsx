'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Grid } from './Grid'
import { useCanvasStore } from '@/lib/store'
import { ZoomControls } from './ZoomControls'

interface CanvasProps {
  children: React.ReactNode
}

export function Canvas({ children }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { zoom, pan, setZoom, setPan, isDragging, setIsDragging } = useCanvasStore()
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      }
    },
    [zoom, setZoom]
  )

  // Handle space key for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsDragging(false)
        setDragStart(null)
        setPanStart(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setIsDragging])

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Handle mouse events for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button (button 1) or space+left click
      if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        e.preventDefault()
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setPanStart({ x: pan.x, y: pan.y })
      }
    },
    [isSpacePressed, pan, setIsDragging]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && dragStart && panStart) {
        const deltaX = (e.clientX - dragStart.x) / zoom
        const deltaY = (e.clientY - dragStart.y) / zoom
        setPan({
          x: panStart.x + deltaX,
          y: panStart.y + deltaY,
        })
      }
    },
    [isDragging, dragStart, panStart, zoom, setPan]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
    setPanStart(null)
  }, [setIsDragging])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    setDragStart(null)
    setPanStart(null)
  }, [setIsDragging])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#f5f5f5] cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: isSpacePressed ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Grid Background */}
      <Grid zoom={zoom} pan={pan} />

      {/* Canvas Content */}
      <motion.div
        className="absolute inset-0"
        animate={{
          x: pan.x,
          y: pan.y,
          scale: zoom,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        style={{
          transformOrigin: '0 0',
        }}
      >
        {children}
      </motion.div>

      {/* Zoom Controls */}
      <ZoomControls />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 select-none pointer-events-none">
        <div>Space + Drag to pan · Ctrl + Scroll to zoom · Middle mouse to pan</div>
      </div>
    </div>
  )
}
