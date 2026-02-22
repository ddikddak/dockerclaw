'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card } from '@/lib/api'
import { CardItem } from './CardItem'
import { CardEmptyState } from './CardEmptyState'

interface CardListProps {
  cards: Card[]
  isLoading?: boolean
  searchQuery?: string
  selectedTags?: string[]
  onCardClick?: (card: Card) => void
  onCardUpdate?: (card: Card) => void
}

// Skeleton loader per cards
function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Thumbnail skeleton */}
      <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 animate-pulse" />
      
      {/* Title skeleton */}
      <div className="h-5 bg-gray-200 rounded mb-2 animate-pulse w-3/4" />
      
      {/* Tags skeleton */}
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
      
      {/* Footer skeleton */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}

export function CardList({ 
  cards, 
  isLoading = false, 
  searchQuery = '', 
  selectedTags = [],
  onCardClick,
  onCardUpdate
}: CardListProps) {
  const router = useRouter()
  
  // Filtrar cards segons cerca i tags
  const filteredCards = cards.filter(card => {
    const title = card.data?.title || ''
    const content = card.data?.content || card.data?.description || ''
    const tags = card.data?.tags || []
    
    // Filtre per text de cerca
    const matchesSearch = !searchQuery || 
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filtre per tags seleccionats
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state - no cards at all
  if (cards.length === 0) {
    return (
      <CardEmptyState 
        variant="no-cards" 
        onCreate={() => router.push('/cards/new')}
      />
    )
  }

  // Empty state - no results from filters
  if (filteredCards.length === 0) {
    return (
      <CardEmptyState 
        variant="no-results"
        onClear={() => {
          // Reset filters - aquesta funció es crida des del pare
          window.location.href = '/'
        }}
      />
    )
  }

  return (
    <motion.div 
      layout
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4"
    >
      {filteredCards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CardItem 
            card={card} 
            onClick={onCardClick}
            onUpdate={onCardUpdate}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
