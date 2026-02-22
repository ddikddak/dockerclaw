'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { CardDetail } from '@/components/CardDetail'
import { api, Card } from '@/lib/api'
import type { Template } from '@/types/template'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CardViewPage() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string

  const [card, setCard] = useState<Card | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar card i template
  useEffect(() => {
    const loadData = async () => {
      if (!cardId) return

      setIsLoading(true)
      setError(null)

      try {
        // Carregar card
        const fetchedCard = await api.getCard(cardId)
        setCard(fetchedCard)

        // Carregar template
        const fetchedTemplate = await api.getTemplate(fetchedCard.template_id)
        setTemplate(fetchedTemplate)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load card'
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [cardId])

  // Eliminar card
  const handleDelete = useCallback(async () => {
    try {
      await api.deleteCard(cardId)
      toast.success('Card deleted')
      router.push('/')
    } catch (err) {
      toast.error('Failed to delete card')
      throw err
    }
  }, [cardId, router])

  // Arxivar card
  const handleArchive = useCallback(async () => {
    try {
      await api.archiveCard(cardId)
      toast.success('Card archived')
      // Recarregar card per mostrar nou estat
      const updatedCard = await api.getCard(cardId)
      setCard(updatedCard)
    } catch (err) {
      toast.error('Failed to archive card')
      throw err
    }
  }, [cardId])

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-500">Loading card...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error || !card || !template) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#f5f5f5] px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
              <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Card not found
              </h2>
              <p className="text-gray-500 mb-6">
                {error || "The card you're looking for doesn't exist or has been deleted."}
              </p>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CardDetail
            card={card}
            template={template}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        </div>
      </div>
    </MainLayout>
  )
}
