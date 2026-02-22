'use client'

import { useEffect, useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import type { Card as CardType, Comment, Reaction } from '@/lib/api'
import { api } from '@/lib/api'
import { useBoardStore, useCanvasStore } from '@/lib/store'
import { CanvasCard } from './CanvasCard'
import { toast } from 'sonner'

// Hook to fetch comments and reactions for cards
function useCardInteractions(cardIds: string[]) {
  const { data: commentsData } = useQuery({
    queryKey: ['comments', cardIds],
    queryFn: async () => {
      const results: Record<string, Comment[]> = {}
      await Promise.all(
        cardIds.map(async (cardId) => {
          try {
            const { comments } = await api.getComments(cardId)
            results[cardId] = comments
          } catch (error) {
            results[cardId] = []
          }
        })
      )
      return results
    },
    enabled: cardIds.length > 0,
    refetchInterval: 5000,
  })

  const { data: reactionsData } = useQuery({
    queryKey: ['reactions', cardIds],
    queryFn: async () => {
      const results: Record<string, Reaction[]> = {}
      await Promise.all(
        cardIds.map(async (cardId) => {
          try {
            const { reactions } = await api.getReactions(cardId)
            results[cardId] = reactions
          } catch (error) {
            results[cardId] = []
          }
        })
      )
      return results
    },
    enabled: cardIds.length > 0,
    refetchInterval: 5000,
  })

  return {
    commentsMap: commentsData || {},
    reactionsMap: reactionsData || {},
  }
}

export function CardLayer() {
  const { cards, selectedCardId, setSelectedCardId, updateCardPosition } =
    useBoardStore()
  const { zoom } = useCanvasStore()
  const queryClient = useQueryClient()

  const cardIds = cards.map((c) => c.id)
  const { commentsMap, reactionsMap } = useCardInteractions(cardIds)

  // Update card position mutation
  const updatePositionMutation = useMutation({
    mutationFn: ({
      cardId,
      x,
      y,
    }: {
      cardId: string
      x: number
      y: number
    }) => api.updateCardPosition(cardId, x, y),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
    onError: (error) => {
      toast.error('Failed to update card position')
      console.error(error)
    },
  })

  // Debounced position update
  const handleMove = useCallback(
    (cardId: string, x: number, y: number) => {
      // Optimistic update
      updateCardPosition(cardId, x, y)

      // Debounced API call
      updatePositionMutation.mutate({ cardId, x, y })
    },
    [updateCardPosition, updatePositionMutation]
  )

  const handleSelect = useCallback(
    (cardId: string) => {
      setSelectedCardId(cardId)
    },
    [setSelectedCardId]
  )

  // Card actions
  const approveMutation = useMutation({
    mutationFn: api.approveCard.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to approve card'),
  })

  const rejectMutation = useMutation({
    mutationFn: api.rejectCard.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to reject card'),
  })

  const archiveMutation = useMutation({
    mutationFn: api.archiveCard.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to archive card'),
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteCard.bind(api),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to delete card'),
  })

  const editTextMutation = useMutation({
    mutationFn: ({
      cardId,
      text,
    }: {
      cardId: string
      componentId: string
      text: string
    }) => api.editText(cardId, 'text', text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to update text'),
  })

  const editCodeMutation = useMutation({
    mutationFn: ({
      cardId,
      code,
    }: {
      cardId: string
      componentId: string
      code: string
    }) => api.editCode(cardId, 'code', code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to update code'),
  })

  const toggleCheckMutation = useMutation({
    mutationFn: ({
      cardId,
      itemIndex,
    }: {
      cardId: string
      componentId: string
      itemIndex: number
    }) => api.toggleCheck(cardId, 'checklist', itemIndex),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
    onError: () => toast.error('Failed to toggle check'),
  })

  const uploadImageMutation = useMutation({
    mutationFn: ({
      cardId,
      file,
    }: {
      cardId: string
      componentId: string
      file: File
    }) => api.uploadImage(cardId, 'image', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Image uploaded')
    },
    onError: () => toast.error('Failed to upload image'),
  })

  const addCommentMutation = useMutation({
    mutationFn: ({ cardId, content }: { cardId: string; content: string }) =>
      api.addComment(cardId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: ({ commentId }: { cardId: string; commentId: string }) =>
      api.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      toast.success('Comment deleted')
    },
    onError: () => toast.error('Failed to delete comment'),
  })

  const toggleReactionMutation = useMutation({
    mutationFn: ({ cardId, emoji }: { cardId: string; emoji: Reaction['emoji'] }) =>
      api.toggleReaction(cardId, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reactions'] }),
    onError: () => toast.error('Failed to toggle reaction'),
  })

  // Deselect when clicking on empty canvas
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.canvas-card')) return
      setSelectedCardId(null)
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [setSelectedCardId])

  return (
    <>
      {cards.map((card) => (
        <CanvasCard
          key={card.id}
          card={card}
          isSelected={selectedCardId === card.id}
          comments={commentsMap[card.id] || []}
          reactions={reactionsMap[card.id] || []}
          currentUserId="current-user"
          onSelect={handleSelect}
          onMove={handleMove}
          onApprove={
            card.status === 'pending' || card.status === 'in_progress'
              ? (id) => approveMutation.mutateAsync(id)
              : undefined
          }
          onReject={
            card.status === 'pending' || card.status === 'in_progress'
              ? (id) => rejectMutation.mutateAsync(id)
              : undefined
          }
          onArchive={
            card.status !== 'archived'
              ? (id) => archiveMutation.mutateAsync(id)
              : undefined
          }
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          onEditText={(id, _, text) =>
            editTextMutation.mutateAsync({ cardId: id, text })
          }
          onEditCode={(id, _, code) =>
            editCodeMutation.mutateAsync({ cardId: id, code })
          }
          onToggleCheck={(id, _, itemIndex) =>
            toggleCheckMutation.mutateAsync({ cardId: id, itemIndex })
          }
          onUploadImage={(id, _, file) =>
            uploadImageMutation.mutateAsync({ cardId: id, file })
          }
          onAddComment={(cardId, content) =>
            addCommentMutation.mutateAsync({ cardId, content })
          }
          onDeleteComment={(cardId, commentId) =>
            deleteCommentMutation.mutateAsync({ cardId, commentId })
          }
          onToggleReaction={(cardId, emoji) =>
            toggleReactionMutation.mutateAsync({ cardId, emoji })
          }
        />
      ))}
    </>
  )
}
