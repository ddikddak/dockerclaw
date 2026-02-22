'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TagBadge } from '@/components/TagBadge'
import { DynamicForm } from '@/components/DynamicForm'
import type { Card as CardType } from '@/lib/api'
import type { Template } from '@/types/template'
import { 
  Edit, 
  Trash2, 
  Archive, 
  Clock, 
  Calendar, 
  FileText,
  LayoutTemplate,
  MoreVertical,
  ArrowLeft
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Helper per formatejar dates
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

interface CardDetailProps {
  card: CardType
  template: Template
  onDelete?: () => void
  onArchive?: () => void
}

export function CardDetail({ card, template, onDelete, onArchive }: CardDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  // Extreure dades de la card
  const title = card.data?.title || 'Untitled Card'
  const tags: string[] = card.data?.tags || []
  const createdAt = new Date(card.created_at)
  const updatedAt = card.updated_at ? new Date(card.updated_at) : null

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) return
    setIsDeleting(true)
    try {
      await onDelete?.()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    try {
      await onArchive?.()
    } finally {
      setIsArchiving(false)
    }
  }

  // Obtenir color del badge segons l'estat
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header amb navegació */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Main Card Header */}
      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 break-words">
                {title}
              </h1>
              
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Template Badge */}
                <Badge 
                  variant="outline" 
                  className="flex items-center gap-1.5 bg-purple-50 border-purple-200 text-purple-700"
                >
                  <LayoutTemplate className="h-3 w-3" />
                  {template.name}
                </Badge>
                
                {/* Status Badge */}
                <Badge 
                  variant="outline"
                  className={`capitalize ${getStatusColor(card.status)}`}
                >
                  {card.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {tags.map((tag, index) => (
                    <TagBadge key={`${tag}-${index}`} tag={tag} />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href={`/cards/${card.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={handleArchive}
                    disabled={isArchiving || card.status === 'archived'}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {isArchiving ? 'Archiving...' : 'Archive'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(createdAt)}</span>
            </div>
            {updatedAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Updated {formatDate(updatedAt)}</span>
              </div>
            )}
          </div>

          {/* Content - DynamicForm en mode read-only */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
              <FileText className="h-4 w-4" />
              <span>Content</span>
            </div>
            
            <DynamicForm
              components={template.components}
              values={card.data}
              onChange={() => {}} // No-op en mode read-only
              readOnly={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
