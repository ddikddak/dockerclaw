'use client'

import { motion } from 'framer-motion'
import { Card } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { FileText, Image, Code, CheckSquare, Database, Type } from 'lucide-react'

interface CardItemProps {
  card: Card
  onClick?: (card: Card) => void
}

// Formatar data relativa ("2h ago", "1d ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Obtenir icona segons el tipus de card
function getCardTypeIcon(type?: string) {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4" />
    case 'code':
      return <Code className="h-4 w-4" />
    case 'checklist':
      return <CheckSquare className="h-4 w-4" />
    case 'data':
      return <Database className="h-4 w-4" />
    case 'text':
      return <Type className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

// Generar thumbnail/preview de la card
function CardThumbnail({ card }: { card: Card }) {
  const type = card.data?.type || 'text'
  
  // Si té imatge, mostrar-la
  if (type === 'image' && card.data?.url) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
        <img 
          src={card.data.url} 
          alt={card.data.title || 'Card image'}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Si té codi, mostrar preview
  if (type === 'code' && card.data?.content) {
    const preview = card.data.content.slice(0, 100)
    return (
      <div className="w-full h-32 bg-gray-900 rounded-lg p-3 mb-3 overflow-hidden">
        <code className="text-xs text-gray-300 font-mono line-clamp-4">
          {preview}
        </code>
      </div>
    )
  }

  // Si és checklist
  if (type === 'checklist' && card.data?.items) {
    const items = card.data.items.slice(0, 3)
    return (
      <div className="w-full h-32 bg-gray-50 rounded-lg p-3 mb-3">
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {item.checked && <CheckSquare className="w-3 h-3 text-white m-0.5" />}
              </div>
              <span className={`text-xs ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.text.slice(0, 30)}{item.text.length > 30 ? '...' : ''}
              </span>
            </div>
          ))}
          {card.data.items.length > 3 && (
            <span className="text-xs text-gray-400">+{card.data.items.length - 3} more</span>
          )}
        </div>
      </div>
    )
  }

  // Default: text preview
  const content = card.data?.content || card.data?.description || ''
  if (content) {
    return (
      <div className="w-full h-32 bg-gray-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-600 line-clamp-4">
          {content.slice(0, 150)}
        </p>
      </div>
    )
  }

  // Empty state thumbnail
  return (
    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-3 flex items-center justify-center">
      <div className="text-gray-300">
        {getCardTypeIcon(type)}
      </div>
    </div>
  )
}

export function CardItem({ card, onClick }: CardItemProps) {
  const title = card.data?.title || 'Untitled Card'
  const type = card.data?.type || 'text'
  const tags: string[] = card.data?.tags || []
  const createdAt = formatRelativeTime(card.created_at)
  const templateName = 'Default' // TODO: Get template name from template_id

  const visibleTags = tags.slice(0, 3)
  const hiddenTagsCount = tags.length - 3

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick?.(card)}
      className="group bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
                 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
    >
      {/* Thumbnail */}
      <CardThumbnail card={card} />

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {visibleTags.map((tag, idx) => (
            <Badge 
              key={idx} 
              variant="secondary" 
              className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {tag}
            </Badge>
          ))}
          {hiddenTagsCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
              +{hiddenTagsCount}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">
            {getCardTypeIcon(type)}
          </span>
          <span className="text-xs text-gray-500">{createdAt}</span>
        </div>
        <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
          {templateName}
        </Badge>
      </div>
    </motion.div>
  )
}
