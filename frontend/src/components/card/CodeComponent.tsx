'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check, X, Copy } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/themes/prism-tomorrow.css'

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

const languageMap: Record<string, string> = {
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  python: 'python',
  py: 'python',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  json: 'json',
  css: 'css',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
}

export function CodeComponent({
  data,
  cardId,
  componentId = 'code',
  editable = false,
  onSave,
}: CodeComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const codeRef = useRef<HTMLPreElement>(null)

  const code = data?.content || ''
  const language = data?.language || 'typescript'
  const normalizedLang = languageMap[language.toLowerCase()] || 'typescript'

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  // Apply syntax highlighting when not editing
  useEffect(() => {
    if (!isEditing && codeRef.current && code) {
      Prism.highlightElement(codeRef.current)
    }
  }, [code, isEditing, normalizedLang])

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
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
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
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
      className={`rounded-md overflow-hidden ${
        editable ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
      }`}
      onDoubleClick={handleDoubleClick}
      title={editable ? 'Double-click to edit' : undefined}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <div className="flex items-center gap-2">
          {editable && (
            <span className="text-xs text-gray-500">Double-click to edit</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <div className="bg-[#2d2d2d] overflow-x-auto">
        <pre className="p-3 m-0">
          <code
            ref={codeRef}
            className={`language-${normalizedLang} text-xs font-mono`}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}
