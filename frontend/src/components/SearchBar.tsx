'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchBar({ 
  onSearch, 
  placeholder = 'Search...',
  debounceMs = 300
}: SearchBarProps) {
  const [query, setQuery] = useState('')

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
      <Search className="absolute left-0 h-4 w-4 text-gray-400" />
      
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-gray-200 pl-6 pr-6 py-1.5 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none transition-colors"
      />
      
      {query && (
        <button
          className="absolute right-0 p-0.5 text-gray-400 hover:text-gray-600"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}