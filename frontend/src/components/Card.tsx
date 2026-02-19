'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import type { Card as CardType } from '@/lib/api'
import { Card as CardUI } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TextComponent } from './card/TextComponent'
import { CodeComponent } from './card/CodeComponent'
import { ChecklistComponent } from './card/ChecklistComponent'

interface CardProps {
  card: CardType
  index: number
}

export function Card({ card, index }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const renderContent = () => {
    const type = card.data?.type || 'text'
    
    switch (type) {
      case 'code':
        return <CodeComponent data={card.data} />
      case 'checklist':
        return <ChecklistComponent data={card.data} />
      case 'text':
      default:
        return <TextComponent data={card.data} />
    }
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <CardUI className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
            {card.data?.title || 'Untitled'}
          </h4>
          <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
            {card.data?.type || 'text'}
          </Badge>
        </div>

        {/* Card Content */}
        <div className="text-sm text-gray-600">
          {renderContent()}
        </div>

        {/* Card Footer */}
        <div className="mt-3 pt-2 border-t text-xs text-gray-400 flex justify-between">
          <span>{new Date(card.created_at).toLocaleDateString()}</span>
          <span className="truncate max-w-[100px]">{card.agent_id.slice(0, 8)}</span>
        </div>
      </CardUI>
    </motion.div>
  )
}
