'use client'

import { motion } from 'framer-motion'
import { Card } from '@/lib/api'
import { CardItem } from './CardItem'
import { EmptyState } from './EmptyState'

interface CardListProps {
  cards: Card[]
  isLoading?: boolean
  searchQuery?: string
  selectedTags?: string[]
  onCardClick?: (card: Card) => void
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
  onCardClick 
}: CardListProps) {
  
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
    return <EmptyState />
  }

  // Empty state - no results from filters
  if (filteredCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
        <p className="text-sm text-gray-500">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    )
  }

  return (
    <motion.div 
      layout
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
    >
      {filteredCards.map((card) => (
        <CardItem 
          key={card.id} 
          card={card} 
          onClick={onCardClick}
        />
      ))}
    </motion.div>
  )
}
