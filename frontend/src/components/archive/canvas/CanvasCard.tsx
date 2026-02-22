'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card as CardType, Comment, Reaction } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  Trash2,
  Archive,
  Loader2,
  MessageCircle,
  GripVertical,
} from 'lucide-react'
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
} from '@/components/card'

interface CanvasCardProps {
  card: CardType
  isSelected: boolean
  comments?: Comment[]
  reactions?: Reaction[]
  currentUserId?: string
  onSelect?: (id: string) => void
  onMove?: (id: string, x: number, y: number) => void
  onApprove?: (id: string) => Promise<any>
  onReject?: (id: string) => Promise<any>
  onDelete?: (id: string) => Promise<any>
  onArchive?: (id: string) => Promise<any>
  onEditText?: (id: string, componentId: string, text: string) => Promise<any>
  onEditCode?: (id: string, componentId: string, code: string) => Promise<any>
  onToggleCheck?: (id: string, componentId: string, itemIndex: number, checked: boolean) => Promise<any>
  onUploadImage?: (id: string, componentId: string, file: File) => Promise<any>
  onAddComment?: (cardId: string, content: string) => Promise<any>
  onDeleteComment?: (cardId: string, commentId: string) => Promise<any>
  onToggleReaction?: (cardId: string, emoji: Reaction['emoji']) => Promise<any>
}

export function CanvasCard({
  card,
  isSelected,
  comments = [],
  reactions = [],
  currentUserId,
  onSelect,
  onMove,
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
}: CanvasCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 })

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !onMove) return
      e.stopPropagation()
      onSelect?.(card.id)

      setIsDragging(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        cardX: card.x || 0,
        cardY: card.y || 0,
      }
    },
    [card.id, card.x, card.y, onMove, onSelect]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !onMove) return
      e.stopPropagation()

      const deltaX = e.clientX - dragStart.current.x
      const deltaY = e.clientY - dragStart.current.y

      const newX = dragStart.current.cardX + deltaX
      const newY = dragStart.current.cardY + deltaY

      onMove(card.id, newX, newY)
    },
    [isDragging, card.id, onMove]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

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
  const canDrag = !!onMove

  return (
    <motion.div
      className={cn(
        'absolute w-[300px] bg-white rounded-xl shadow-md select-none canvas-card',
        canDrag && 'cursor-grab active:cursor-grabbing',
        isSelected && 'ring-2 ring-blue-500 shadow-lg',
        isHovered && !isDragging && 'shadow-xl'
      )}
      style={{
        left: card.x || 0,
        top: card.y || 0,
        zIndex: isDragging ? 100 : isSelected ? 50 : isHovered ? 40 : 10,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        if (isDragging) setIsDragging(false)
      }}
    >
      {/* Drag handle */}
      {canDrag && (
        <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity z-10">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Card Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
            {card.data?.title || 'Untitled'}
          </h3>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-5 flex-shrink-0', getStatusColor(card.status))}
          >
            {card.status}
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <div className="px-4 py-2">
        <div className="text-sm text-gray-600">{renderContent()}</div>
      </div>

      {/* Reactions Bar */}
      {hasInteractions && (
        <div className="px-4 pt-2 border-t">
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
        {(isHovered || isProcessing || isSelected) &&
          (onApprove || onReject || onDelete || onArchive || hasInteractions) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 pt-2 border-t flex gap-2 justify-end flex-wrap overflow-hidden"
            >
              {hasInteractions && (
                <Button
                  size="sm"
                  variant={showComments ? 'default' : 'outline'}
                  className={`h-7 px-2 text-xs ${showComments ? 'bg-blue-500 hover:bg-blue-600' : 'text-gray-600'}`}
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
                  className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
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
                  className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
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
                  className="h-7 px-2 text-xs text-gray-600"
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
            className="px-4 pt-3 border-t overflow-hidden"
            onClick={(e) => e.stopPropagation()}
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
      <div className="px-4 py-2 border-t text-xs text-gray-400 flex justify-between items-center">
        <span>{new Date(card.created_at).toLocaleDateString()}</span>
        <div className="flex items-center gap-2">
          <CompactReactions reactions={reactions} currentUserId={currentUserId} />
          <span className="truncate max-w-[80px]">
            {card.agent_id?.slice(0, 8) || 'system'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
