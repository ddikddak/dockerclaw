'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { CardList } from '@/components/CardList'
import { SearchBar } from '@/components/SearchBar'
import { Button } from '@/components/ui/button'
import { api, Card } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const [cards, setCards] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Carregar cards de Supabase
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
    // Per ara només console.log, després navegarem a /cards/[id]
    console.log('Card clicked:', card)
    // TODO: router.push(`/cards/${card.id}`)
  }, [])

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-[#f5f5f5]">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-b border-gray-200 px-6 py-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage your cards and content
              </p>
            </div>

            <div className="flex items-center gap-3">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search cards..."
              />
              
              <Link href="/cards/new">
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Card
                </Button>
              </Link>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <CardList 
              cards={cards}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onCardClick={handleCardClick}
            />
          )}
        </div>
      </div>
    </MainLayout>
  )
}
