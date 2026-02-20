'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

interface TextComponentProps {
  data: {
    description?: string
    content?: string
  }
  cardId?: string
  componentId?: string
  editable?: boolean
  onSave?: (text: string) => Promise<void>
}

export function TextComponent({ 
  data, 
  cardId, 
  componentId = 'text',
  editable = false,
  onSave 
}: TextComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const content = data?.description || data?.content || ''

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    if (editable) {
      setEditText(content)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      await onSave(editText)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] text-sm resize-none"
          placeholder="Enter text..."
        />
        <div className="flex gap-2 justify-end">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
        <div className="text-xs text-gray-400">
          Ctrl+Enter to save, Esc to cancel
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <span 
        className="text-gray-400 italic cursor-pointer hover:text-gray-500"
        onDoubleClick={handleDoubleClick}
      >
        {editable ? 'Double-click to edit' : 'No content'}
      </span>
    )
  }

  return (
    <div 
      className={`line-clamp-3 text-gray-600 ${editable ? 'cursor-pointer hover:bg-gray-50 p-1 rounded -m-1' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={editable ? 'Double-click to edit' : undefined}
    >
      {content}
    </div>
  )
}
