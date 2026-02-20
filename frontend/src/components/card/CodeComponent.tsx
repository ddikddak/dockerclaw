'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

interface CodeComponentProps {
  data: {
    content?: string
    language?: string
  }
  cardId?: string
  componentId?: string
  editable?: boolean
  onSave?: (code: string) => Promise<void>
}

export function CodeComponent({ 
  data, 
  cardId, 
  componentId = 'code',
  editable = false,
  onSave 
}: CodeComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const code = data?.content || ''
  const language = data?.language || 'typescript'

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    if (editable) {
      setEditCode(code)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      await onSave(editCode)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditCode('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="bg-gray-900 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
            <span className="text-xs text-gray-400">{language}</span>
            <span className="text-xs text-gray-500">Editing</span>
          </div>
          <Textarea
            ref={textareaRef}
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[150px] bg-gray-900 text-gray-100 border-0 rounded-none resize-none font-mono text-xs"
            placeholder="Enter code..."
          />
        </div>
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
          Ctrl+S to save, Esc to cancel
        </div>
      </div>
    )
  }

  if (!code) {
    return (
      <span 
        className="text-gray-400 italic cursor-pointer hover:text-gray-500"
        onDoubleClick={handleDoubleClick}
      >
        {editable ? 'Double-click to edit code' : 'No code'}
      </span>
    )
  }

  return (
    <div 
      className={`bg-gray-900 rounded-md overflow-hidden ${editable ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={editable ? 'Double-click to edit' : undefined}
    >
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400">{language}</span>
        {editable && <span className="text-xs text-gray-500">Double-click to edit</span>}
      </div>
      <pre className="p-3 text-xs text-gray-100 overflow-x-auto">
        <code>{code.slice(0, 200)}{code.length > 200 && '...'}</code>
      </pre>
    </div>
  )
}
