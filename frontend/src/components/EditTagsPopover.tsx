'use client'

import { useState, useCallback } from 'react'
import { Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TagInput } from './TagInput'
import { TagBadge } from './TagBadge'
import { api, Card } from '@/lib/api'

interface EditTagsPopoverProps {
  card: Card
  onUpdate?: (card: Card) => void
  children?: React.ReactNode
}

export function EditTagsPopover({ card, onUpdate, children }: EditTagsPopoverProps) {
  const [tags, setTags] = useState<string[]>(card.data?.tags || [])
  const [isSaving, setIsSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      const updatedCard = await api.updateCardTags(card.id, tags)
      onUpdate?.(updatedCard)
      setOpen(false)
    } catch (error) {
      console.error('Failed to update tags:', error)
    } finally {
      setIsSaving(false)
    }
  }, [card.id, tags, onUpdate])

  const handleCancel = useCallback(() => {
    // Reset to original tags
    setTags(card.data?.tags || [])
    setOpen(false)
  }, [card.data?.tags])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Tag className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Tag className="h-4 w-4" />
            <span>Edit Tags</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500">
              Tags (press Enter or comma to add)
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add a tag..."
            />
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Current tags:</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, index) => (
                  <TagBadge
                    key={`${tag}-${index}`}
                    tag={tag}
                    onRemove={() => {
                      const newTags = tags.filter((_, i) => i !== index)
                      setTags(newTags)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
