'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TagBadge } from './TagBadge'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  maxLength?: number
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add tag...',
  maxTags = 10,
  maxLength = 30
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const normalizeTag = (tag: string): string => {
    return tag.toLowerCase().trim().slice(0, maxLength)
  }

  const canAddTag = (tag: string): boolean => {
    const normalized = normalizeTag(tag)
    if (!normalized) return false
    if (value.includes(normalized)) return false // No duplicates
    if (value.length >= maxTags) return false
    return true
  }

  const addTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag)
    if (canAddTag(normalized)) {
      onChange([...value, normalized])
    }
    setInputValue('')
  }, [value, onChange, maxTags, maxLength])

  const removeTag = useCallback((index: number) => {
    const newTags = value.filter((_, i) => i !== index)
    onChange(newTags)
  }, [value, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(value.length - 1)
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      {value.map((tag, index) => (
        <TagBadge
          key={`${tag}-${index}`}
          tag={tag}
          onRemove={() => removeTag(index)}
        />
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-7 text-sm bg-transparent"
        disabled={value.length >= maxTags}
      />
    </div>
  )
}
