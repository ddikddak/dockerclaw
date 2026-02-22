'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { CardList } from '@/components/CardList'
import { SearchBar } from '@/components/SearchBar'
import { TagFilter } from '@/components/TagFilter'
import { api, Card } from '@/lib/api'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useAppKeyboard } from '@/hooks/useKeyboard'

export default function Home() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    const loadCards = async () => {
      setIsLoading(true)
      try {
        const { cards: fetchedCards } = await api.getCards()
        setCards(fetchedCards)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cards'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadCards()
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleCardClick = useCallback((card: Card) => {
    router.push(`/cards/${card.id}`)
  }, [router])

  const handleCardUpdate = useCallback((updatedCard: Card) => {
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === updatedCard.id ? updatedCard : card
      )
    )
    toast.success('Tags updated')
  }, [])

  useAppKeyboard({
    onNewCard: () => router.push('/cards/new'),
    onEscape: () => {
      setSearchQuery('')
      setSelectedTags([])
    }
  })

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Header minimal */}
        <header className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search..."
              />
            </div>

            <Link 
              href="/cards/new"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Card
            </Link>
          </div>

          <div className="mt-4">
            <TagFilter 
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <CardList 
            cards={cards}
            isLoading={isLoading}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            onCardClick={handleCardClick}
            onCardUpdate={handleCardUpdate}
          />
        </div>
      </div>
    </MainLayout>
  )
}