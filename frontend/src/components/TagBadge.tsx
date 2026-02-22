import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagBadgeProps {
  tag: string
  onRemove?: () => void
  onClick?: () => void
  selected?: boolean
  className?: string
}

export function TagBadge({
  tag,
  onRemove,
  onClick,
  selected = false,
  className
}: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-gray-600 bg-gray-100 transition-colors',
        selected && 'bg-gray-800 text-white',
        onClick && 'cursor-pointer hover:bg-gray-200',
        onRemove && 'pr-1',
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
          className="p-0.5 hover:text-gray-900"
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
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] text-gray-600 bg-gray-100">
      {tag}
    </span>
  )
}