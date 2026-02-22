'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string
  onRemove?: () => void
  onClick?: () => void
  selected?: boolean
  className?: string
}

// Generate color based on tag hash (same logic as backend)
function getTagColorClasses(tag: string): string {
  const colors = [
    'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    'bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-200',
    'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
    'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
    'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
    'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200',
    'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200',
    'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
    'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
  ]
  
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function TagBadge({
  tag,
  onRemove,
  onClick,
  selected = false,
  className
}: TagBadgeProps) {
  const colorClasses = getTagColorClasses(tag)

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-default',
        colorClasses,
        selected && 'ring-2 ring-offset-1 ring-blue-500',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <span>{tag}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="inline-flex items-center justify-center rounded-full hover:bg-black/10 p-0.5 transition-colors"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

// Simple badge without interactions (for display only)
export function TagBadgeStatic({ tag }: { tag: string }) {
  const colorClasses = getTagColorClasses(tag)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        colorClasses
      )}
    >
      {tag}
    </span>
  )
}
