'use client'

import { useEffect, useState } from 'react'
import { X, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagBadge } from './TagBadge'
import { api } from '@/lib/api'

interface TagFilterProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

export function TagFilter({ selectedTags, onChange }: TagFilterProps) {
  const [allTags, setAllTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTags() {
      try {
        setIsLoading(true)
        const { tags } = await api.getTags()
        setAllTags(tags)
      } catch (err) {
        setError('Failed to load tags')
        console.error('Error fetching tags:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTags()
  }, [])

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  const clearFilters = () => {
    onChange([])
  }

  // Show nothing if no tags exist
  if (!isLoading && allTags.length === 0 && selectedTags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Tags className="h-4 w-4" />
          <span>Filter by tags</span>
        </div>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {isLoading ? (
          // Loading skeleton
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"
              />
            ))}
          </>
        ) : (
          <>
            {allTags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                selected={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className="cursor-pointer select-none"
              />
            ))}
          </>
        )}
      </div>

      {selectedTags.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Showing cards with {selectedTags.length === 1 ? 'tag' : 'any of these tags'}
        </p>
      )}
    </div>
  )
}
