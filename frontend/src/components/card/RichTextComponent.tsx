'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Check,
  X,
} from 'lucide-react'

interface RichTextComponentProps {
  data: {
    content?: string
  }
  cardId?: string
  componentId?: string
  editable?: boolean
  onSave?: (html: string) => Promise<void>
}

export function RichTextComponent({
  data,
  cardId,
  componentId = 'rich_text',
  editable = false,
  onSave,
}: RichTextComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: data?.content || '<p></p>',
    editable: isEditing,
  })

  // Update editor content when data changes (only when not editing)
  useEffect(() => {
    if (editor && !isEditing && data?.content !== editor.getHTML()) {
      editor.commands.setContent(data?.content || '<p></p>')
    }
  }, [data?.content, editor, isEditing])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return
      
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, editor])

  const handleDoubleClick = () => {
    if (editable) {
      setIsEditing(true)
      editor?.setEditable(true)
    }
  }

  const handleSave = async () => {
    if (!onSave || !editor) return

    setIsSaving(true)
    try {
      const html = editor.getHTML()
      await onSave(html)
      setIsEditing(false)
      editor.setEditable(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    editor?.setEditable(false)
    // Revert to original content
    editor?.commands.setContent(data?.content || '<p></p>')
  }

  const setLink = () => {
    if (!editor) return
    
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  if (!editor) {
    return null
  }

  const Toolbar = () => (
    <div className="flex items-center gap-1 border-b border-gray-200 pb-2 mb-2">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        className="h-7 w-7 p-0"
        onClick={setLink}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )

  // Editing mode
  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="border rounded-lg p-3 bg-white">
          <Toolbar />
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none focus:outline-none min-h-[100px] [&_*]:focus:outline-none"
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
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
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

  // Display mode
  const content = data?.content

  if (!content || content === '<p></p>' || content === '<p></p>\n') {
    return (
      <div
        className={`text-gray-400 italic ${
          editable
            ? 'cursor-pointer hover:text-gray-500 p-2 rounded hover:bg-gray-50'
            : ''
        }`}
        onDoubleClick={handleDoubleClick}
      >
        {editable ? 'Double-click to edit rich text' : 'No content'}
      </div>
    )
  }

  return (
    <div
      className={`relative ${
        editable ? 'cursor-pointer hover:bg-gray-50 p-2 rounded -m-2' : ''
      }`}
      onDoubleClick={handleDoubleClick}
      title={editable ? 'Double-click to edit' : undefined}
    >
      <div
        className="prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
