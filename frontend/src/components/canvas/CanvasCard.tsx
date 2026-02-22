'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card as CardType } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ImageIcon, GripVertical } from 'lucide-react'

interface CanvasCardProps {
  card: CardType
  isSelected: boolean
  onSelect: () => void
  onDrag: (x: number, y: number) => void
  zoom: number
}

export function CanvasCard({ card, isSelected, onSelect, onDrag, zoom }: CanvasCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Només drag amb botó esquerre, i no si és middle button (pan)
      if (e.button !== 0) return

      e.stopPropagation()
      onSelect()

      setIsDragging(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        cardX: card.x || 0,
        cardY: card.y || 0,
      }
    },
    [card.x, card.y, onSelect]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return

      e.stopPropagation()

      const deltaX = (e.clientX - dragStart.current.x) / zoom
      const deltaY = (e.clientY - dragStart.current.y) / zoom

      const newX = dragStart.current.cardX + deltaX
      const newY = dragStart.current.cardY + deltaY

      onDrag(newX, newY)
    },
    [isDragging, zoom, onDrag]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Obtenir el color del status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Obtenir la primera línia de descripció
  const getDescription = () => {
    const desc = card.data?.description || card.data?.content || ''
    return desc.split('\n')[0].slice(0, 100) + (desc.length > 100 ? '...' : '')
  }

  // Obtenir tags si n'hi ha
  const tags = card.data?.tags || []

  return (
    <motion.div
      className={cn(
        'absolute w-[300px] bg-white rounded-xl shadow-md cursor-grab active:cursor-grabbing select-none',
        'transition-shadow duration-200 ease-out',
        isSelected && 'ring-2 ring-blue-500 shadow-lg',
        isHovered && !isDragging && 'shadow-xl scale-[1.02]'
      )}
      style={{
        left: card.x || 0,
        top: card.y || 0,
        zIndex: isDragging ? 100 : isSelected ? 50 : isHovered ? 40 : 10,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsDragging(false)
      }}
    >
      {/* Drag handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Card Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
            {card.data?.title || 'Untitled'}
          </h3>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-5 flex-shrink-0', getStatusColor(card.status))}
          >
            {card.status}
          </Badge>
        </div>
      </div>

      {/* Thumbnail si té imatge */}
      {card.data?.url && card.data?.type === 'image' && (
        <div className="px-4 py-2">
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={card.data.url}
              alt={card.data?.title || 'Image'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-2">
        <p className="text-sm text-gray-600 line-clamp-2">{getDescription()}</p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag: string, index: number) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5"
            >
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Type indicator */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
          {card.data?.type || 'text'}
        </Badge>
        <span className="text-[10px] text-gray-400">
          {new Date(card.created_at).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  )
}
