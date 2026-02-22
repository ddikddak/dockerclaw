'use client'

import { Card } from '@/lib/api'
import { FileText, Image, Code, CheckSquare, Database, Type } from 'lucide-react'
import { TagBadge } from './TagBadge'
import { EditTagsPopover } from './EditTagsPopover'

interface CardItemProps {
  card: Card
  onClick?: (card: Card) => void
  onUpdate?: (card: Card) => void
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCardTypeIcon(type?: string) {
  switch (type) {
    case 'image': return <Image className="h-3.5 w-3.5" />
    case 'code': return <Code className="h-3.5 w-3.5" />
    case 'checklist': return <CheckSquare className="h-3.5 w-3.5" />
    case 'data': return <Database className="h-3.5 w-3.5" />
    case 'text': return <Type className="h-3.5 w-3.5" />
    default: return <FileText className="h-3.5 w-3.5" />
  }
}

function CardThumbnail({ card }: { card: Card }) {
  const type = card.data?.type || 'text'
  
  if (type === 'image' && card.data?.url) {
    return (
      <div className="w-full h-28 bg-gray-50 overflow-hidden mb-3">
        <img 
          src={card.data.url} 
          alt={card.data.title || 'Card image'}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  if (type === 'code' && card.data?.content) {
    const preview = card.data.content.slice(0, 80)
    return (
      <div className="w-full h-28 bg-gray-900 p-3 mb-3 overflow-hidden">
        <code className="text-[11px] text-gray-400 font-mono line-clamp-4">
          {preview}
        </code>
      </div>
    )
  }

  if (type === 'checklist' && card.data?.items) {
    const items = card.data.items.slice(0, 3)
    return (
      <div className="w-full h-28 bg-gray-50 p-3 mb-3">
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 border ${item.checked ? 'bg-gray-800 border-gray-800' : 'border-gray-300'}`} />
              <span className={`text-[11px] ${item.checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                {item.text.slice(0, 25)}{item.text.length > 25 ? '...' : ''}
              </span>
            </div>
          ))}
          {card.data.items.length > 3 && (
            <span className="text-[10px] text-gray-400">+{card.data.items.length - 3} more</span>
          )}
        </div>
      </div>
    )
  }

  const content = card.data?.content || card.data?.description || ''
  if (content) {
    return (
      <div className="w-full h-28 bg-gray-50 p-3 mb-3">
        <p className="text-xs text-gray-600 line-clamp-4">
          {content.slice(0, 120)}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-28 bg-gray-50 mb-3 flex items-center justify-center">
      <div className="text-gray-300">{getCardTypeIcon(type)}</div>
    </div>
  )
}

export function CardItem({ card, onClick, onUpdate }: CardItemProps) {
  const title = card.data?.title || 'Untitled'
  const type = card.data?.type || 'text'
  const tags: string[] = card.data?.tags || []
  const createdAt = formatRelativeTime(card.created_at)

  const visibleTags = tags.slice(0, 2)

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-edit-tags]')) return
    onClick?.(card)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group bg-white p-4 cursor-pointer border border-transparent hover:border-gray-200 transition-all duration-150"
    >
      <CardThumbnail card={card} />

      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-1">
        {title}
      </h3>

      <div className="flex flex-wrap items-center gap-1 mb-3">
        {visibleTags.map((tag, idx) => (
          <TagBadge key={`${tag}-${idx}`} tag={tag} />
        ))}
        <EditTagsPopover card={card} onUpdate={onUpdate}>
          <button
            data-edit-tags
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100"
            title="Edit tags"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-400"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </EditTagsPopover>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-gray-400">
          {getCardTypeIcon(type)}
          <span className="text-[10px]">{createdAt}</span>
        </div>
      </div>
    </div>
  )
}