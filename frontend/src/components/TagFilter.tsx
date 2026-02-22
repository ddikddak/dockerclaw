'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-2 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Tags className="h-4 w-4" />
          <span>Filter by tags</span>
        </div>
        <AnimatePresence>
          {selectedTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            // Loading skeleton
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"
                />
              ))}
            </>
          ) : (
            <>
              {allTags.map((tag, index) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.03 }}
                  layout
                >
                  <TagBadge
                    tag={tag}
                    selected={selectedTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                    className="cursor-pointer select-none"
                  />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedTags.length > 0 && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-gray-500 mt-1"
          >
            Showing cards with {selectedTags.length === 1 ? 'tag' : 'any of these tags'}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
