'use client'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useBoardStore } from '@/lib/store'
import { api, type Card as CardType } from '@/lib/api'
import { Board } from './Board'
import { Card } from './Card'
import { motion, AnimatePresence } from 'framer-motion'

export function DndProvider() {
  const [activeCard, setActiveCard] = useState<CardType | null>(null)
  const { cards, moveCard } = useBoardStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = cards.find((c) => c.id === active.id)
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const cardId = active.id as string
    const overId = over.id as string

    // Check if dropped over a column
    const isColumn = ['pending', 'in_progress', 'approved'].includes(overId)
    
    if (isColumn) {
      const newStatus = overId as CardType['status']
      const card = cards.find((c) => c.id === cardId)
      
      if (card && card.status !== newStatus) {
        // Optimistic update
        moveCard(cardId, newStatus)
        
        // API call
        try {
          await api.executeCardAction(cardId, {
            action: 'move',
            payload: { column: newStatus },
          })
        } catch (error) {
          // Revert on error
          moveCard(cardId, card.status)
          console.error('Failed to move card:', error)
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={['pending', 'in_progress', 'approved']} 
        strategy={horizontalListSortingStrategy}
      >
        <Board />
      </SortableContext>

      <DragOverlay>
        {activeCard ? (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.05 }}
            className="opacity-90"
          >
            <Card card={activeCard} index={0} />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
