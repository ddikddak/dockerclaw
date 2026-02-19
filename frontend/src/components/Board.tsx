'use client'

import { useEffect } from 'react'
import { api, type Card } from '@/lib/api'
import { useBoardStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useSSE } from '@/hooks/useSSE'
import { Column } from './Column'
import { motion } from 'framer-motion'

const columns = [
  { id: 'pending', title: 'Todo', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'approved', title: 'Done', color: 'bg-green-50' },
] as const

export function Board() {
  const { setCards, cards } = useBoardStore()

  // Initial data fetch
  const { data, isLoading, error } = useQuery({
    queryKey: ['cards'],
    queryFn: () => api.getCards(),
  })

  useEffect(() => {
    if (data) {
      setCards(data)
    }
  }, [data, setCards])

  // Real-time updates via SSE
  useSSE()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading cards...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error loading cards</div>
      </div>
    )
  }

  return (
    <motion.div 
      className="flex gap-6 p-8 min-w-max"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {columns.map((column, index) => (
        <Column
          key={column.id}
          id={column.id}
          title={column.title}
          color={column.color}
          cards={cards.filter((card) => card.status === column.id)}
          index={index}
        />
      ))}
    </motion.div>
  )
}
