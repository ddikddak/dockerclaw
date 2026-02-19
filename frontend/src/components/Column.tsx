'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import type { Card as CardType } from '@/lib/api'
import { Card } from './Card'
import { Badge } from '@/components/ui/badge'

interface ColumnProps {
  id: string
  title: string
  color: string
  cards: CardType[]
  index: number
}

export function Column({ id, title, color, cards, index }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`w-80 flex-shrink-0 rounded-lg ${color} border shadow-sm`}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-white/50 rounded-t-lg flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {cards.length}
        </Badge>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`p-3 min-h-[200px] space-y-3 transition-colors rounded-b-lg ${
          isOver ? 'bg-black/5' : ''
        }`}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card, cardIndex) => (
            <Card 
              key={card.id} 
              card={card} 
              index={cardIndex}
            />
          ))}
        </SortableContext>
        
        {cards.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop cards here
          </div>
        )}
      </div>
    </motion.div>
  )
}
