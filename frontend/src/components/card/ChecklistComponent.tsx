'use client'

import { Checkbox } from '@/components/ui/checkbox'

interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistComponentProps {
  data: {
    checklist?: ChecklistItem[]
  }
}

export function ChecklistComponent({ data }: ChecklistComponentProps) {
  const checklist = data?.checklist || []

  if (checklist.length === 0) {
    return <span className="text-gray-400 italic">No items</span>
  }

  const completed = checklist.filter((item) => item.checked).length
  const total = checklist.length

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 mb-2">
        {completed} of {total} completed
      </div>
      
      <div className="space-y-1">
        {checklist.slice(0, 3).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Checkbox 
              checked={item.checked} 
              className="h-4 w-4"
              disabled
            />
            <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.text}
            </span>
          </div>
        ))}
        
        {checklist.length > 3 && (
          <div className="text-xs text-gray-400">
            +{checklist.length - 3} more items
          </div>
        )}
      </div>
    </div>
  )
}
