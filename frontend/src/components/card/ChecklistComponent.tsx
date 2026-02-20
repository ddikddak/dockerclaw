'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistComponentProps {
  data: {
    items?: ChecklistItem[]
  }
  cardId?: string
  componentId?: string
  editable?: boolean
  onToggle?: (itemIndex: number, checked: boolean) => Promise<void>
}

export function ChecklistComponent({ 
  data, 
  cardId, 
  componentId = 'checklist',
  editable = false,
  onToggle 
}: ChecklistComponentProps) {
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null)
  const checklist = data?.items || []

  if (checklist.length === 0) {
    return <span className="text-gray-400 italic">No items</span>
  }

  const completed = checklist.filter((item) => item.checked).length
  const total = checklist.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  const handleToggle = async (index: number, checked: boolean) => {
    if (!editable || !onToggle || togglingIndex !== null) return
    
    setTogglingIndex(index)
    try {
      await onToggle(index, checked)
    } catch (error) {
      console.error('Failed to toggle:', error)
    } finally {
      setTogglingIndex(null)
    }
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {completed}/{total}
        </div>
      </div>
      
      <div className="space-y-1">
        {checklist.slice(0, 4).map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            {togglingIndex === index ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <Checkbox 
                checked={item.checked} 
                className={`h-4 w-4 ${editable ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={!editable || togglingIndex !== null}
                onCheckedChange={(checked) => handleToggle(index, checked as boolean)}
              />
            )}
            <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.text}
            </span>
          </div>
        ))}
        
        {checklist.length > 4 && (
          <div className="text-xs text-gray-400">
            +{checklist.length - 4} more items
          </div>
        )}
      </div>
    </div>
  )
}
