'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Card as CardType } from '@/lib/api'
import { api } from '@/lib/api'
import { useBoardStore } from '@/lib/store'
import { Card } from './Card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ActionResponse } from '@/lib/api'

interface ColumnProps {
  id: string
  title: string
  color: string
  cards: CardType[]
  index: number
}

export function Column({ id, title, color, cards, index }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  })
  
  const { updateCard, deleteCard } = useBoardStore()
  const queryClient = useQueryClient()

  // Card-level actions
  const approveMutation = useMutation<ActionResponse, Error, string>({
    mutationFn: api.approveCard.bind(api),
    onSuccess: (data) => {
      updateCard(data.card.id, { status: 'approved' as const })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to approve card')
    },
  })

  const rejectMutation = useMutation<ActionResponse, Error, string>({
    mutationFn: api.rejectCard.bind(api),
    onSuccess: (data) => {
      updateCard(data.card.id, { status: 'rejected' as const })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to reject card')
    },
  })

  const archiveMutation = useMutation<ActionResponse, Error, string>({
    mutationFn: api.archiveCard.bind(api),
    onSuccess: (data) => {
      updateCard(data.card.id, { status: 'archived' as const })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to archive card')
    },
  })

  const deleteMutation = useMutation<ActionResponse, Error, string>({
    mutationFn: api.deleteCard.bind(api),
    onSuccess: (data) => {
      deleteCard(data.card.id)
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to delete card')
    },
  })

  // Component-level actions
  const editTextMutation = useMutation<ActionResponse, Error, { cardId: string; componentId: string; text: string }>({
    mutationFn: ({ cardId, componentId, text }) =>
      api.editText(cardId, componentId, text),
    onSuccess: (data) => {
      updateCard(data.card.id, { data: data.card.data })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to update text')
    },
  })

  const editCodeMutation = useMutation<ActionResponse, Error, { cardId: string; componentId: string; code: string }>({
    mutationFn: ({ cardId, componentId, code }) =>
      api.editCode(cardId, componentId, code),
    onSuccess: (data) => {
      updateCard(data.card.id, { data: data.card.data })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to update code')
    },
  })

  const toggleCheckMutation = useMutation<ActionResponse, Error, { cardId: string; componentId: string; itemIndex: number }>({
    mutationFn: ({ cardId, componentId, itemIndex }) =>
      api.toggleCheck(cardId, componentId, itemIndex),
    onSuccess: (data) => {
      updateCard(data.card.id, { data: data.card.data })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to toggle check')
    },
  })

  const uploadImageMutation = useMutation<ActionResponse, Error, { cardId: string; componentId: string; file: File }>({
    mutationFn: ({ cardId, componentId, file }) =>
      api.uploadImage(cardId, componentId, file),
    onSuccess: (data) => {
      updateCard(data.card.id, { data: data.card.data })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Image uploaded successfully')
    },
    onError: (error) => {
      toast.error('Failed to upload image')
    },
  })

  const handleApprove = async (cardId: string) => {
    await approveMutation.mutateAsync(cardId)
  }

  const handleReject = async (cardId: string) => {
    await rejectMutation.mutateAsync(cardId)
  }

  const handleArchive = async (cardId: string) => {
    await archiveMutation.mutateAsync(cardId)
  }

  const handleDelete = async (cardId: string) => {
    await deleteMutation.mutateAsync(cardId)
  }

  const handleEditText = async (cardId: string, componentId: string, text: string) => {
    await editTextMutation.mutateAsync({ cardId, componentId, text })
  }

  const handleEditCode = async (cardId: string, componentId: string, code: string) => {
    await editCodeMutation.mutateAsync({ cardId, componentId, code })
  }

  const handleToggleCheck = async (cardId: string, componentId: string, itemIndex: number) => {
    await toggleCheckMutation.mutateAsync({ cardId, componentId, itemIndex })
  }

  const handleUploadImage = async (cardId: string, componentId: string, file: File) => {
    await uploadImageMutation.mutateAsync({ cardId, componentId, file })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`w-80 flex-shrink-0 rounded-lg ${color} border shadow-sm`}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-white/50 rounded-t-lg flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {cards.length}
        </Badge>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`p-3 min-h-[200px] space-y-3 transition-colors rounded-b-lg ${
          isOver ? 'bg-black/5' : ''
        }`}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card, cardIndex) => (
            <Card
              key={card.id}
              card={card}
              index={cardIndex}
              onApprove={id === 'pending' || id === 'in_progress' ? handleApprove : undefined}
              onReject={id === 'pending' || id === 'in_progress' ? handleReject : undefined}
              onArchive={id !== 'archived' ? handleArchive : undefined}
              onDelete={handleDelete}
              onEditText={handleEditText}
              onEditCode={handleEditCode}
              onToggleCheck={handleToggleCheck}
              onUploadImage={handleUploadImage}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop cards here
          </div>
        )}
      </div>
    </motion.div>
  )
}
