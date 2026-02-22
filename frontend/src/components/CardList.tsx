'use client'

import { useRouter } from 'next/navigation'
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

function CardSkeleton() {
  return (
    <div className="bg-white p-4">
      <div className="w-full h-28 bg-gray-100 mb-3 animate-pulse" />
      <div className="h-4 bg-gray-100 mb-2 animate-pulse w-3/4" />
      <div className="flex gap-1 mb-3">
        <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
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
  
  const filteredCards = cards.filter(card => {
    const title = card.data?.title || ''
    const content = card.data?.content || card.data?.description || ''
    const tags = card.data?.tags || []
    
    const matchesSearch = !searchQuery || 
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <CardEmptyState 
        variant="no-cards" 
        onCreate={() => router.push('/cards/new')}
      />
    )
  }

  if (filteredCards.length === 0) {
    return (
      <CardEmptyState 
        variant="no-results"
        onClear={() => {
          window.location.href = '/'
        }}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {filteredCards.map((card) => (
        <CardItem 
          key={card.id}
          card={card} 
          onClick={onCardClick}
          onUpdate={onCardUpdate}
        />
      ))}
    </div>
  )
}