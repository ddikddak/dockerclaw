'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useCanvasStore } from '@/lib/store'

interface GridProps {
  zoom: number
  pan: { x: number; y: number }
}

export function Grid({ zoom, pan }: GridProps) {
  const gridSize = 20 * zoom
  const dotSize = Math.max(1, 1.5 * zoom)
  
  // Calculate offset based on pan
  const offsetX = pan.x % gridSize
  const offsetY = pan.y % gridSize

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, #d4d4d4 ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  )
}
