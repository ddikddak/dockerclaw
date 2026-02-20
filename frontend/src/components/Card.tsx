'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import type { Card as CardType, Comment, Reaction } from '@/lib/api'
import { Card as CardUI } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Trash2, Archive, Loader2, MessageCircle } from 'lucide-react'
import {
  TextComponent,
  CodeComponent,
  ChecklistComponent,
  ImageComponent,
  RichTextComponent,
  DataComponent,
  Comments,
  Reactions,
  CompactReactions,
} from './card'

interface CardProps {
  card: CardType
  index: number
  comments?: Comment[]
  reactions?: Reaction[]
  currentUserId?: string
  onApprove?: (id: string) => Promise<void>
  onReject?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onArchive?: (id: string) => Promise<void>
  onEditText?: (id: string, componentId: string, text: string) => Promise<void>
  onEditCode?: (id: string, componentId: string, code: string) => Promise<void>
  onToggleCheck?: (id: string, componentId: string, itemIndex: number, checked: boolean) => Promise<void>
  onUploadImage?: (id: string, componentId: string, file: File) => Promise<void>
  onAddComment?: (cardId: string, content: string) => Promise<void>
  onDeleteComment?: (cardId: string, commentId: string) => Promise<void>
  onToggleReaction?: (cardId: string, emoji: Reaction['emoji']) => Promise<void>
}

export function Card({
  card,
  index,
  comments = [],
  reactions = [],
  currentUserId,
  onApprove,
  onReject,
  onDelete,
  onArchive,
  onEditText,
  onEditCode,
  onToggleCheck,
  onUploadImage,
  onAddComment,
  onDeleteComment,
  onToggleReaction,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleAction = async (
    action: string,
    handler?: (id: string) => Promise<void>
  ) => {
    if (!handler) return
    setIsProcessing(action)
    try {
      await handler(card.id)
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleEditText = async (componentId: string, text: string) => {
    if (!onEditText) return
    await onEditText(card.id, componentId, text)
  }

  const handleEditCode = async (componentId: string, code: string) => {
    if (!onEditCode) return
    await onEditCode(card.id, componentId, code)
  }

  const handleToggleCheck = async (
    componentId: string,
    itemIndex: number,
    checked: boolean
  ) => {
    if (!onToggleCheck) return
    await onToggleCheck(card.id, componentId, itemIndex, checked)
  }

  const handleUploadImage = async (componentId: string, file: File) => {
    if (!onUploadImage) return
    await onUploadImage(card.id, componentId, file)
  }

  const handleAddComment = async (content: string) => {
    if (!onAddComment) return
    await onAddComment(card.id, content)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return
    await onDeleteComment(card.id, commentId)
  }

  const handleToggleReaction = async (emoji: Reaction['emoji']) => {
    if (!onToggleReaction) return
    await onToggleReaction(card.id, emoji)
  }

  const renderContent = () => {
    const type = card.data?.type || 'text'

    switch (type) {
      case 'code':
        return (
          <CodeComponent
            data={card.data}
            cardId={card.id}
            editable={!!onEditCode}
            onSave={(code) => handleEditCode('code', code)}
          />
        )
      case 'checklist':
        return (
          <ChecklistComponent
            data={card.data}
            cardId={card.id}
            editable={!!onToggleCheck}
            onToggle={(index, checked) =>
              handleToggleCheck('checklist', index, checked)
            }
          />
        )
      case 'image':
        return (
          <ImageComponent
            data={card.data}
            cardId={card.id}
            editable={!!onUploadImage}
            onUpload={(file) => handleUploadImage('image', file)}
          />
        )
      case 'rich_text':
        return (
          <RichTextComponent
            data={card.data}
            cardId={card.id}
            editable={!!onEditText}
            onSave={(html) => handleEditText('rich_text', html)}
          />
        )
      case 'data':
        return (
          <DataComponent
            data={card.data}
            cardId={card.id}
            editable={false}
          />
        )
      case 'text':
      default:
        return (
          <TextComponent
            data={card.data}
            cardId={card.id}
            editable={!!onEditText}
            onSave={(text) => handleEditText('text', text)}
          />
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const hasInteractions = onAddComment || onToggleReaction
  const hasReactions = reactions.length > 0

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-grab active:cursor-grabbing relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardUI className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 flex-1">
            {card.data?.title || 'Untitled'}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(card.status)}`}
            >
              {card.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {card.data?.type || 'text'}
            </Badge>
          </div>
        </div>

        {/* Card Content */}
        <div className="text-sm text-gray-600">{renderContent()}</div>

        {/* Reactions Bar */}
        {hasInteractions && (
          <div className="mt-3 pt-2 border-t">
            <Reactions
              reactions={reactions}
              cardId={card.id}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction ? handleToggleReaction : undefined}
            />
          </div>
        )}

        {/* Action Buttons */}
        <AnimatePresence>
          {(isHovered || isProcessing) &&
            (onApprove || onReject || onDelete || onArchive || hasInteractions) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="mt-3 pt-2 border-t flex gap-2 justify-end flex-wrap"
              >
                {hasInteractions && (
                  <Button
                    size="sm"
                    variant={showComments ? 'default' : 'outline'}
                    className={`h-7 px-2 ${showComments ? 'bg-blue-500 hover:bg-blue-600' : 'text-gray-600'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowComments(!showComments)
                    }}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {comments.length > 0 ? `${comments.length}` : 'Comments'}
                  </Button>
                )}

                {onApprove && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction('approve', onApprove)
                    }}
                    disabled={isProcessing !== null}
                  >
                    {isProcessing === 'approve' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Approve
                  </Button>
                )}

                {onReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction('reject', onReject)
                    }}
                    disabled={isProcessing !== null}
                  >
                    {isProcessing === 'reject' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Reject
                  </Button>
                )}

                {onArchive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction('archive', onArchive)
                    }}
                    disabled={isProcessing !== null}
                  >
                    {isProcessing === 'archive' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Archive className="h-3 w-3 mr-1" />
                    )}
                    Archive
                  </Button>
                )}

                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction('delete', onDelete)
                    }}
                    disabled={isProcessing !== null}
                  >
                    {isProcessing === 'delete' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </motion.div>
            )}
        </AnimatePresence>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && hasInteractions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t overflow-hidden"
            >
              <Comments
                comments={comments}
                cardId={card.id}
                currentUserId={currentUserId}
                onAddComment={onAddComment ? handleAddComment : undefined}
                onDeleteComment={onDeleteComment ? handleDeleteComment : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Footer */}
        <div className="mt-3 pt-2 border-t text-xs text-gray-400 flex justify-between items-center">
          <span>{new Date(card.created_at).toLocaleDateString()}</span>
          <div className="flex items-center gap-2">
            {/* Compact Reactions Display */}
            <CompactReactions reactions={reactions} currentUserId={currentUserId} />
            <span className="truncate max-w-[100px]">
              {card.agent_id.slice(0, 8)}
            </span>
          </div>
        </div>
      </CardUI>
    </motion.div>
  )
}
