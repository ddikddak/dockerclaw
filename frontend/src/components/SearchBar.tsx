'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchBar({ 
  onSearch, 
  placeholder = 'Search cards...',
  debounceMs = 300
}: SearchBarProps) {
  const [query, setQuery] = useState('')

  // Debounce la cerca
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(query)
    }, debounceMs)

    return () => clearTimeout(timeout)
  }, [query, onSearch, debounceMs])

  const handleClear = useCallback(() => {
    setQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <div className="relative flex items-center">
      <div className="absolute left-3 text-gray-400">
        <Search className="h-4 w-4" />
      </div>
      
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 w-full max-w-md bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />
      
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7 text-gray-400 hover:text-gray-600"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
