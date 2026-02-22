'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { InfiniteCanvas } from '@/components/canvas/InfiniteCanvas'
import { useBoardStore } from '@/lib/store'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { cards, setCards, setLoading, isLoading, error, setError } = useBoardStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar cards de Supabase
  useEffect(() => {
    const loadCards = async () => {
      setLoading(true)
      setError(null)

      try {
        const { cards: fetchedCards } = await api.getCards()
        
        // Assignar posicions per defecte si no en tenen
        const cardsWithPositions = fetchedCards.map((card, index) => ({
          ...card,
          x: card.x ?? (index % 5) * 320 + 50,
          y: card.y ?? Math.floor(index / 5) * 200 + 50,
        }))

        setCards(cardsWithPositions)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cards'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    loadCards()
  }, [setCards, setLoading, setError])

  if (!isInitialized || isLoading) {
    return (
      <MainLayout>
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading canvas...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">Error loading canvas</p>
            <p className="text-gray-500 mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <InfiniteCanvas />
    </MainLayout>
  )
}
